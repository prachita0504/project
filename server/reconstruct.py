import pycolmap
import subprocess
from pathlib import Path
import sys

COLMAP = "colmap"

frames = Path("../frames")
workspace = Path("../workspace")
dense = workspace / "dense"
dense_sparse = dense / "sparse"
model = Path("../model")

database = workspace / "database.db"

workspace.mkdir(exist_ok=True)
dense.mkdir(parents=True, exist_ok=True)
dense_sparse.mkdir(parents=True, exist_ok=True)
model.mkdir(exist_ok=True)

print("STEP 1: Feature extraction (CPU)")

pycolmap.extract_features(
    database_path=str(database),
    image_path=str(frames),
    camera_model="SIMPLE_RADIAL",
    device=pycolmap.Device.cpu   # 🔴 CPU
)

print("STEP 2: Sequential matching (CPU)")

pycolmap.match_sequential(
    database_path=str(database),
    device=pycolmap.Device.cpu   # 🔴 CPU
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

largest_id, largest = max(maps.items(), key=lambda item: item[1].num_reg_images())

largest.export_PLY(str(model / "model.ply"))

print("Sparse reconstruction done")

sparse_model_path = workspace / str(largest_id)

print("STEP 4: Image undistortion")

subprocess.run([
    COLMAP,
    "image_undistorter",
    "--image_path", str(frames),
    "--input_path", str(sparse_model_path),
    "--output_path", str(dense),
    "--output_type", "COLMAP"
], check=True)

print("STEP 5: Patch match stereo (GPU)")

subprocess.run([
    COLMAP,
    "patch_match_stereo",
    "--workspace_path", str(dense),
    "--workspace_format", "COLMAP",
    "--PatchMatchStereo.gpu_index", "0"
], check=True)

print("STEP 6: Stereo fusion")

subprocess.run([
    COLMAP,
    "stereo_fusion",
    "--workspace_path", str(dense),
    "--workspace_format", "COLMAP",
    "--output_path", str(model / "dense.ply")
], check=True)

print("STEP 7: Mesh reconstruction")

subprocess.run([
    COLMAP,
    "poisson_mesher",
    "--input_path", str(model / "dense.ply"),
    "--output_path", str(model / "mesh.ply")
], check=True)

print("DONE - Mesh created")