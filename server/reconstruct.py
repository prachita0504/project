import pycolmap
from pathlib import Path
import sys

frames = Path("../frames")
workspace = Path("../workspace")
model = Path("../model")

workspace.mkdir(exist_ok=True)
model.mkdir(exist_ok=True)

database = workspace / "database.db"

print("STEP 1: Feature extraction")

pycolmap.extract_features(
    database_path=str(database),
    image_path=str(frames),
    camera_model="SIMPLE_RADIAL"
)

print("STEP 2: Matching")

pycolmap.match_sequential(
    database_path=str(database)
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

print("Exporting PLY")

largest.export_PLY(str(model / "model.ply"))

print("DONE - Point cloud created")