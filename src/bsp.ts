
import { extract, TypeMapping } from "./binary";
import { Vector3 } from "three";
import { quakePalette } from "./palette";
import { parseString } from "./utils";

const HEADER30 = [
    "ENTITIES",
    "PLANES",
    "TEXTURES",
    "VERTICES",
    "VISIBILITY",
    "NODES",
    "TEXINFO",
    "FACES",
    "LIGHTING",
    "CLIPNODES",
    "LEAVES",
    "MARKSURFACES",
    "EDGES",
    "SURFEDGES",
    "MODELS",
    "HEADER_LUMPS"
]

interface Header {
    id: number;
    lumps: { [key: string]: Lump };
}

export interface Lump {
    name: string;
    offset: number;
    size: number;
}

export interface Node {
    plane: number;
    front: number;
    back: number;
    bbox: [Vector3, Vector3];
    face: number; // First face
    faces: number; // Number of faces
}

export interface Leaf {
    type: number;
    vislist: number;
    bbox: [Vector3, Vector3];
    face: number;
    faces: number;
    ambient: number[];
}

export interface Face {
    plane: number;
    side: number;
    firstEdge: number;
    edges: number;
    styles: number;
    textureInfo: number;
    lightmapOffset: number;
}

export interface Plane {
    x: number;
    y: number;
    z: number;
    dist: number;
    type: number;
}

export interface Entity {
    classname: string;
    origin?: string;
    [key: string]: string;
}

export interface Model {
    min: number[];
    max: number[];
    origin: number[];
    nodes: number[];
    visLeafs: number;
    firstFace: number;
    faces: number;
}

export interface Texture {
    name: string;
    width: number;
    height: number;
    offset1: number;
    offset2: number;
    offset4: number;
    offset8: number;
    pixels?: Uint8Array;
    palette?: number[][];
    globalOffset?: number; // Offset into the file
}

export interface TexInfo {
    vs: Vector3;
    sShift: number;
    vt: Vector3;
    tShift: number;
    mipTex: number;
    flags: number;
}

export interface BSP {
    header: Header;
    nodes: Node[];
    leaves: Leaf[];
    visibility: number[];
    vertices: Vector3[];
    edges: number[][];
    planes: Plane[];
    faces: Face[];
    surfEdges: number[];
    entities: Entity[];
    texInfo: TexInfo[];
    models: Model[];
    textures: Texture[];
    lighting: number[][];
}

function parseHeader(buffer: ArrayBuffer) {

    const view = new DataView(buffer);
    let id = view.getUint32(0, true);

    const lumpData: { [key: string]: Lump } = {}

    for (let i = 0; i < HEADER30.length; i++) {
        let lumpType = HEADER30[i];
        const offset = view.getUint32((i * 8) + 4, true);
        const size = view.getUint32((i * 8) + 8, true);
        lumpData[lumpType] = { name: lumpType, offset, size };
    }

    return {
        id,
        lumps: lumpData
    };
}

function extractLump(buffer: ArrayBuffer, lump: Lump, types: (keyof TypeMapping)[]) {
    return extract(new DataView(buffer, lump.offset, lump.size), types);
}

function parseEntities(entityString: string) {

    const split = entityString.split("\n");
    const entities: any[] = [];
    let tempObject: { [key: string]: string } = {};

    split.forEach(line => {
        if (line === "{") {
            // new temp object
            tempObject = {};
        }
        else if (line === "}") {
            // push to entities
            entities.push(tempObject);
        }
        else {
            const data = line.replace(/\"/g, "").split(" ");
            tempObject[data[0]] = data.slice(1).join(" ");
        }
    });

    return entities;
}

export function parseBSP(buffer: ArrayBuffer): BSP {

    const header = parseHeader(buffer);
    const lumps = header.lumps;
    const edges = extractLump(buffer, lumps["EDGES"], ["Uint16", "Uint16"]);
    const planes = extractLump(buffer, lumps["PLANES"], ["Float32", "Float32", "Float32", "Float32", "Uint32"]).map(data => {
        return {
            x: data[0],
            y: data[1],
            z: data[2],
            dist: data[3],
            type: data[4]
        }
    });
    const surfEdges = extractLump(buffer, lumps["SURFEDGES"], ["Int32"]);

    // [TODO] This depends on BSP version (1b vs 3b)
    const lighting = header.id === 30
        ? extractLump(buffer, lumps["LIGHTING"], ["Uint8", "Uint8", "Uint8"])
        : extractLump(buffer, lumps["LIGHTING"], ["Uint8"]);

    // Entities is a special case
    const entityLump = lumps["ENTITIES"];
    const entityString = Buffer.from(buffer.slice(entityLump.offset, entityLump.offset + entityLump.size)).toString("ascii");
    const entities = parseEntities(entityString);

    const vertices = extractLump(buffer, lumps["VERTICES"], ["Float32", "Float32", "Float32"]).map(vertex => {
        return new Vector3(vertex[0], vertex[1], vertex[2]);
    });

    const nodes: Node[] = extractLump(buffer, lumps["NODES"], ["Uint32", "Int16", "Int16", "Int16", "Int16", "Int16", "Int16", "Int16", "Int16", "Uint16", "Uint16"]).map(data => {
        return {
            plane: data[0],
            front: data[1],
            back: data[2],
            bbox: [new Vector3(data[3], data[4], data[5]), new Vector3(data[6], data[7], data[8])],
            face: data[9],
            faces: data[10]
        }
    });

    const leaves: Leaf[] = extractLump(buffer, lumps["LEAVES"], ["Int32", "Int32", "Int16", "Int16", "Int16", "Int16", "Int16", "Int16", "Uint16", "Uint16", "Uint8", "Uint8", "Uint8", "Uint8"]).map(data => {
        return {
            type: data[0],
            vislist: data[1],
            bbox: [new Vector3(data[2], data[3], data[4]), new Vector3(data[5], data[6], data[7])],
            face: data[8],
            faces: data[9],
            ambient: [data[10], data[11], data[12], data[13]]
        }
    });

    // Parse visplane
    const visibility: number[] = extractLump(buffer, lumps["VISIBILITY"], ["Uint8"]);

    // Parse textures
    const texInfo = extractLump(buffer, lumps["TEXINFO"], ["Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Uint32", "Uint32"]).map(data => {
        return {
            vs: new Vector3(data[0], data[1], data[2]),
            sShift: data[3],
            vt: new Vector3(data[4], data[5], data[6]),
            tShift: data[7],
            mipTex: data[8],
            flags: data[9]
        }
    });

    // Parse models
    const models = extractLump(buffer, lumps["MODELS"], ["Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Float32", "Int32", "Int32", "Int32", "Int32", "Int32", "Int32", "Int32"]).map(data => {
        return {
            min: [data[0], data[1], data[2]],
            max: [data[3], data[4], data[5]],
            origin: [data[6], data[7], data[8]],
            nodes: [data[9], data[10], data[11], data[12]],
            visLeafs: data[13],
            firstFace: data[14],
            faces: data[15]
        }
    });

    // Parse faces
    const faces = extractLump(buffer, lumps["FACES"], ["Uint16", "Uint16", "Uint32", "Uint16", "Uint16", "Uint32", "Uint32"]).map(data => {
        return {
            plane: data[0],
            side: data[1],
            firstEdge: data[2],
            edges: data[3],
            textureInfo: data[4],
            styles: data[5],
            lightmapOffset: data[6]
        }
    });

    // Parse textures
    const textureLump = lumps["TEXTURES"];
    const textureView = new DataView(buffer.slice(textureLump.offset, textureLump.offset + textureLump.size));

    const numTextures = textureView.getUint32(0, true);

    const offsetView = new DataView(buffer, textureLump.offset + 4, (numTextures * 4));
    const textureOffsets = extract(offsetView, ["Int32"]);

    const textures: Texture[] = [];

    textureOffsets.forEach(offset => {
        const o = textureLump.offset + offset;
        const name = parseString(Buffer.from(buffer.slice(o, o + 16)));
        const mipView = new DataView(buffer, o + 16, 24);
        const data = extract(mipView, ["Uint32", "Uint32", "Uint32", "Uint32", "Uint32", "Uint32"]).map(data => {
            const width = data[0];
            const height = data[1];
            const offset1 = data[2];
            const offset2 = data[3];
            const offset4 = data[4];
            const offset8 = data[5];
            const palleteOffset = o + offset8 + Math.floor((width * height) / 64) + 2;
            const paletteArray = new Uint8Array(buffer.slice(palleteOffset, palleteOffset + (256 * 3)));
            let palette: number[][] = [];

            if (header.id === 30) {
                for (let i = 0; i < 256; i++) {
                    palette.push([paletteArray[i * 3], paletteArray[i * 3 + 1], paletteArray[i * 3 + 2]]);
                }
            }
            else {
                palette = quakePalette;
            }

            return {
                name,
                width,
                height,
                offset1,
                offset2,
                offset4,
                offset8,
                palette,
                globalOffset: o
            }
        });

        textures.push(...data);
    });

    const bsp: BSP = {
        header,
        nodes,
        leaves,
        visibility,
        vertices,
        edges,
        planes,
        entities,
        faces,
        surfEdges,
        texInfo,
        models,
        textures,
        lighting
    };

    return bsp;
}