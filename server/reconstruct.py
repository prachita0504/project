import pycolmap
import subprocess
from pathlib import Path
import sys

COLMAP = "colmap"

frames = Path("../frames")
workspace = Path("../workspace")
dense = workspace / "dense"
model = Path("../model")

workspace.mkdir(exist_ok=True)
dense.mkdir(exist_ok=True)
model.mkdir(exist_ok=True)

database = workspace / "database.db"

print("STEP 1: Feature extraction")

pycolmap.extract_features(
    database_path=database,
    image_path=frames,
    camera_model="SIMPLE_RADIAL"
)

print("STEP 2: Feature matching")

pycolmap.match_sequential(database)

print("STEP 3: Sparse mapping")

maps = pycolmap.incremental_mapping(
    database_path=database,
    image_path=frames,
    output_path=workspace
)

if len(maps) == 0:
    print("No reconstruction created")
    sys.exit(1)

# choose largest reconstruction automatically
largest = max(maps.values(), key=lambda r: r.num_reg_images())

largest.export_PLY(model / "model.ply")

print("Sparse reconstruction done")
print("Sparse model saved at ../model/model.ply")

sparse_model_path = workspace / str(largest.model_id)

print("STEP 4: Image undistortion")

result = subprocess.run([
    COLMAP,
    "image_undistorter",
    "--image_path", str(frames),
    "--input_path", str(sparse_model_path),
    "--output_path", str(dense),
    "--output_type", "COLMAP"
])

if result.returncode != 0:
    print("image_undistorter failed")
    sys.exit(1)

print("STEP 5: Patch match stereo")

result = subprocess.run([
    COLMAP,
    "patch_match_stereo",
    "--workspace_path", str(dense)
])

if result.returncode != 0:
    print("Dense stereo failed (likely no CUDA). Continuing with sparse model.")
    sys.exit(0)

print("STEP 6: Stereo fusion")

result = subprocess.run([
    COLMAP,
    "stereo_fusion",
    "--workspace_path", str(dense),
    "--output_path", str(model / "dense.ply")
])

if result.returncode != 0:
    print("stereo_fusion failed")
    sys.exit(0)

print("STEP 7: Mesh reconstruction")

result = subprocess.run([
    COLMAP,
    "poisson_mesher",
    "--input_path", str(model / "dense.ply"),
    "--output_path", str(model / "mesh.ply")
])

if result.returncode != 0:
    print("poisson_mesher failed")
    sys.exit(0)

print("DONE - Mesh created")