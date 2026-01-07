import { Wad } from "./Wad";
import { Texture } from "./Bsp";
import {
    DataTexture,
    RepeatWrapping,
    RGBAFormat,
} from "three";
import { QuakeTexture } from "./QuakeTexture";

// Generate Valve-style purple/black checkerboard missing texture
function createMissingTexture(): DataTexture {
    const size = 64;
    const checkSize = 8;
    const data = new Uint8Array(size * size * 4);

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const i = (y * size + x) * 4;
            const isCheck = ((Math.floor(x / checkSize) + Math.floor(y / checkSize)) % 2) === 0;

            if (isCheck) {
                // Purple (255, 0, 255)
                data[i] = 255;
                data[i + 1] = 0;
                data[i + 2] = 255;
            } else {
                // Black
                data[i] = 0;
                data[i + 1] = 0;
                data[i + 2] = 0;
            }
            data[i + 3] = 255; // Alpha
        }
    }

    const texture = new DataTexture(data, size, size, RGBAFormat);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.needsUpdate = true;
    return texture;
}

const developmentTexture = createMissingTexture();

export class WadManager {
    private wads: Map<string, Wad>;
    private requiredWads: Record<string, boolean> = {};

    constructor() {
        this.wads = new Map<string, Wad>();
    }

    getWads(): Wad[] {
        return Array.from(this.wads.values());
    }

    names() {
        return this.wads.keys();
    }

    load(name: string, buffer: ArrayBuffer) {
        const wad = new Wad(buffer);

        console.log(`WAD Loaded: ${name}`);
        this.wads.set(name, wad);
    }

    remove(name: string) {
        this.wads.delete(name);
    }

    clear() {
        this.wads.clear();
    }

    find(textureName: string) {
        // Loop over loaded wads until we find a texture with the same name

        for (const [_, wad] of this.wads) {
            const texture = wad.textures[textureName];
            if (texture) {
                const qt = this.data(texture);
                const dataTexture = new DataTexture(
                    qt.data(),
                    texture.width,
                    texture.height,
                    RGBAFormat
                );
                return dataTexture;
            }
        }

        console.warn(`Texture not found: ${textureName}`);

        return developmentTexture;
    }

    public setRequiredWads(wads: string[]) {
        this.requiredWads = {};

        wads.forEach(wad => {
            this.requiredWads[wad] = this.wads.has(wad);
        });
    }

    public wadState() {
        return this.requiredWads;
    }

    private data(texture: Texture): QuakeTexture {
        return new QuakeTexture(texture.palette, texture.pixels);
    }
}
