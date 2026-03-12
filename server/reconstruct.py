import pycolmap
import subprocess
from pathlib import Path
import sys
from PIL import Image
import shutil

COLMAP = "colmap"

frames = Path("../frames")
workspace = Path("../workspace")
dense = workspace / "dense"
model = Path("../model")
database = workspace / "database.db"

# Clean workspace
if workspace.exists():
    shutil.rmtree(workspace)

workspace.mkdir(exist_ok=True)
dense.mkdir(parents=True, exist_ok=True)
model.mkdir(exist_ok=True)

print("STEP 0: Checking frames")

valid = 0

for img in frames.glob("*.jpg"):
    try:
        im = Image.open(img)
        w, h = im.size

        if w < 10 or h < 10:
            img.unlink()
        else:
            valid += 1

    except:
        img.unlink()

print("Valid frames:", valid)

if valid < 10:
    print("Not enough frames")
    sys.exit(1)

print("STEP 1: Feature extraction")

pycolmap.extract_features(
    database_path=str(database),
    image_path=str(frames),
    camera_model="SIMPLE_RADIAL",
    device=pycolmap.Device.cpu
)

print("STEP 2: Matching")

pycolmap.match_sequential(
    database_path=str(database),
    device=pycolmap.Device.cpu
)

print("STEP 3: Sparse mapping")

maps = pycolmap.incremental_mapping(
    database_path=str(database),
    image_path=str(frames),
    output_path=str(workspace)
)

if len(maps) == 0:
    print("No reconstruction created")
    sys.exit(1)

largest_id, largest = max(maps.items(), key=lambda x: x[1].num_reg_images())

largest.export_PLY(str(model / "model.ply"))

print("Sparse reconstruction done")

sparse_model = workspace / str(largest_id)

print("STEP 4: Image undistortion")

subprocess.run([
    COLMAP,
    "image_undistorter",
    "--image_path", str(frames),
    "--input_path", str(sparse_model),
    "--output_path", str(dense),
    "--output_type", "COLMAP",
    "--max_image_size", "1600"
], check=True)

print("STEP 5: Dense stereo")

try:

    subprocess.run([
        COLMAP,
        "patch_match_stereo",
        "--workspace_path", str(dense),
        "--workspace_format", "COLMAP",
        "--PatchMatchStereo.max_image_size", "1200",
        "--PatchMatchStereo.geom_consistency", "true",
        "--PatchMatchStereo.gpu_index", "0"
    ], check=True)

except:

    print("GPU failed → using CPU")

    subprocess.run([
        COLMAP,
        "patch_match_stereo",
        "--workspace_path", str(dense),
        "--workspace_format", "COLMAP",
        "--PatchMatchStereo.max_image_size", "1200",
        "--PatchMatchStereo.gpu_index", "-1"
    ], check=True)

print("STEP 6: Stereo fusion")

subprocess.run([
    COLMAP,
    "stereo_fusion",
    "--workspace_path", str(dense),
    "--workspace_format", "COLMAP",
    "--output_path", str(model / "dense.ply")
], check=True)

print("STEP 7: Mesh")

subprocess.run([
    COLMAP,
    "poisson_mesher",
    "--input_path", str(model / "dense.ply"),
    "--output_path", str(model / "mesh.ply")
], check=True)

print("DONE")