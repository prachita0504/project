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

# create required folders
workspace.mkdir(exist_ok=True)
dense.mkdir(parents=True, exist_ok=True)
dense_sparse.mkdir(parents=True, exist_ok=True)
model.mkdir(exist_ok=True)

database = workspace / "database.db"

print("STEP 1: Feature extraction")

pycolmap.extract_features(
    database_path=database,
    image_path=frames,
    camera_model="SIMPLE_RADIAL",
    sift_options={"use_gpu": True}
)

print("STEP 2: Sequential feature matching")

pycolmap.match_sequential(
    database_path=database,
    matching_options={"use_gpu": True}
)

print("STEP 3: Sparse mapping")

maps = pycolmap.incremental_mapping(
    database_path=database,
    image_path=frames,
    output_path=workspace
)

if len(maps) == 0:
    print("No reconstruction created")
    sys.exit(1)

# choose largest reconstruction
largest_id, largest = max(maps.items(), key=lambda item: item[1].num_reg_images())

largest.export_PLY(model / "model.ply")

print("Sparse reconstruction done")
print("Sparse model saved at ../model/model.ply")

sparse_model_path = workspace / str(largest_id)

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
])

if result.returncode != 0:
    print("image_undistorter failed")
    sys.exit(1)

print("STEP 5: Patch match stereo (GPU)")

result = subprocess.run([
    COLMAP,
    "patch_match_stereo",
    "--workspace_path", str(dense),
    "--workspace_format", "COLMAP",
    "--PatchMatchStereo.gpu_index", "0"
])

if result.returncode != 0:
    print("Dense stereo failed (CUDA may not be available).")
    print("Continuing with sparse model only.")
    sys.exit(0)

print("STEP 6: Stereo fusion")

result = subprocess.run([
    COLMAP,
    "stereo_fusion",
    "--workspace_path", str(dense),
    "--workspace_format", "COLMAP",
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