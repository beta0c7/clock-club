# Thumbnail Generator

This tool uses a headless browser (Puppeteer) inside a Docker container to automatically generate 128x128 PNG thumbnails for the Clock Club editor.

## How it Works

- **`render.js`**: A Node.js script that uses Puppeteer to navigate to `https://editor.clockwise.page/thumbnail.html`. It reads input files from a `shared` directory, passes the filename (as `cw`) and the branch to the URL parameters, takes a screenshot of the rendered page, and saves it into an `exported` directory.
- **`Dockerfile`**: Packages the Puppeteer environment, copies the script, installs dependencies, and defines the entrypoint. It expects two volumes to be mounted: `/app/shared` (for input files) and `/app/exported` (for output images).

## Usage

### 1. Build the Docker Image

Run the following command in this directory to build the Docker image:

```bash
docker build -t thumbnail-generator .
```

### 2. Run the Container

When running the container, you must mount your local data folders into the container's expected volumes (`/app/shared` for inputs and `/app/exported` for outputs).

Assuming your source files are in `../shared` and you want outputs to go to `../exported`, run:

```bash
docker run --rm \
  -v $(pwd)/../../shared:/app/shared \
  -v $(pwd)/../../exported:/app/exported \
  -e CLOCK_CLUB_BRANCH=main \
  thumbnail-generator
```

#### Configuration
- **Volumes (`-v`)**: The left side of the colon is your local path; the right side is the container path. Adjust the local paths to point to wherever your actual `.json` files are.
- **Branch (`-e CLOCK_CLUB_BRANCH`)**: Optional. Defines the branch parameter used in the URL. Defaults to `main` if omitted.
- **Clean up (`--rm`)**: Automatically removes the container after the rendering script finishes executing.
