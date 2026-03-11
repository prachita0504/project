import pycolmap
import subprocess
from pathlib import Path
import sys

COLMAP = "colmap"

frames = Path("../frames")
workspace = Path("../workspace")
dense = Path("../dense")
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

reconstruction = list(maps.values())[0]
reconstruction.export_PLY(model / "model.ply")

print("Sparse reconstruction done")
print("Sparse model saved at ../model/model.ply")

sparse_model_path = workspace / "0"
if not sparse_model_path.exists():
    print("Sparse model folder not found")
    sys.exit(1)

print("STEP 4: Image undistortion")

result = subprocess.run([
    COLMAP,
    "image_undistorter",
    "--image_path", str(frames),
    "--input_path", str(sparse_model_path),
    "--output_path", str(dense),
    "--output_type", "COLMAP"
], check=False)

if result.returncode != 0:
    print("image_undistorter failed")
    sys.exit(1)

print("STEP 5: Patch match stereo")

result = subprocess.run([
    COLMAP,
    "patch_match_stereo",
    "--workspace_path", str(dense)
], check=False)

if result.returncode != 0:
    print("Dense stereo failed. CUDA not available.")
    print("Continuing with sparse model only.")
    sys.exit(0)

print("STEP 6: Stereo fusion")

result = subprocess.run([
    COLMAP,
    "stereo_fusion",
    "--workspace_path", str(dense),
    "--output_path", str(model / "dense.ply")
], check=False)

if result.returncode != 0:
    print("stereo_fusion failed")
    sys.exit(0)

print("STEP 7: Mesh reconstruction")

result = subprocess.run([
    COLMAP,
    "poisson_mesher",
    "--input_path", str(model / "dense.ply"),
    "--output_path", str(model / "mesh.ply")
], check=False)

if result.returncode != 0:
    print("poisson_mesher failed")
    sys.exit(0)

print("DONE - Mesh created")