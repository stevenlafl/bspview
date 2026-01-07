# bspreader

A CLI tool for packaging GoldSrc engine maps (Half-Life, Counter-Strike, etc.) with all their required dependencies into distributable ZIP files.

Based on BSP parsing code from [bspview](https://github.com/sbuggay/bspview).

## Features

- **BSP Parsing** - Reads and extracts geometry, textures, and entity data from BSP files
- **Texture Loading** - Loads textures from WAD archives and embedded BSP textures
- **Asset Packaging** - Packages maps with all required dependencies (WADs, models, sounds) into ZIP files

## Usage (Docker)

The easiest way to use bspreader is with Docker.

### Build the Docker image

```bash
./build.sh
```

### Run against a mod directory

Edit `run.sh` to point to your mod directory, then:

```bash
./run.sh
```

Or run directly:

```bash
docker run -it --rm \
  -v /path/to/Half-Life/modname:/app \
  stevenlafl/bspreader
```

The container will:
1. Run `resgen` to generate `.res` (resource list) files from BSP maps in `/app/maps/`
2. Run `bspreader` to package each map with its dependencies into a ZIP file

## Usage (Manual)

### Install dependencies

```bash
npm install
```

### Build

```bash
npm run build
```

### Run

You need `.res` files for your maps first. Generate them with `resgen` or create them manually.

Then run from within the mod directory:

```bash
cd /path/to/Half-Life/modname
node /path/to/bspreader/dist/index.js .
```

The tool looks for `.res` files in `./maps/` and outputs ZIP files to the current directory.

## Project Structure

| File | Description |
|------|-------------|
| `src/index.ts` | CLI entry point - reads .res files and creates ZIP packages |
| `src/Bsp.ts` | BSP file format parser - extracts lumps (geometry, textures, entities, etc.) |
| `src/QuakeMap.ts` | Map manager - parses BSP and identifies required assets |
| `src/Wad.ts` | WAD texture archive parser |
| `src/WadManager.ts` | Manages loaded WAD files and texture lookup |
| `src/QuakeTexture.ts` | Converts indexed textures to RGBA using color palettes |
| `src/Palette.ts` | Color palette data for texture rendering |

## Reference

- http://hlbsp.sourceforge.net/index.php?content=bspdef
- http://www.gamers.org/dEngine/quake/spec/quake-spec34/qkspec_4.htm
