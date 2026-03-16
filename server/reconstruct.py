import subprocess
import os
import sys

frames = "../frames"
workspace = "../workspace"
model = "../model"

database = f"{workspace}/database.db"
sparse = f"{workspace}/sparse"

# create folders
os.makedirs(workspace, exist_ok=True)
os.makedirs(model, exist_ok=True)
os.makedirs(sparse, exist_ok=True)

print("STEP 1: feature extraction")

subprocess.run([
"colmap","feature_extractor",
"--database_path",database,
"--image_path",frames,
"--ImageReader.camera_model","SIMPLE_RADIAL"
], check=True)

print("STEP 2: sequential matching")

subprocess.run([
"colmap","sequential_matcher",
"--database_path",database
], check=True)

print("STEP 3: mapping")

subprocess.run([
"colmap","mapper",
"--database_path",database,
"--image_path",frames,
"--output_path",sparse
], check=True)

model_path = f"{sparse}/0"

# check reconstruction exists
if not os.path.exists(model_path):
    print("❌ Reconstruction failed")
    sys.exit(1)

print("STEP 4: exporting point cloud")

subprocess.run([
"colmap","model_converter",
"--input_path",model_path,
"--output_path",f"{model}/model.ply",
"--output_type","PLY"
], check=True)

print("✅ DONE - model.ply created")