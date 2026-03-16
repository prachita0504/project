import subprocess
import os

frames="../frames"
workspace="../workspace"
model="../model"

os.makedirs(workspace,exist_ok=True)
os.makedirs(model,exist_ok=True)

print("STEP 1: feature extraction")

subprocess.run([
"colmap","feature_extractor",
"--database_path",f"{workspace}/database.db",
"--image_path",frames,
"--ImageReader.camera_model","SIMPLE_RADIAL"
])

print("STEP 2: matching")

subprocess.run([
"colmap","sequential_matcher",
"--database_path",f"{workspace}/database.db"
])

print("STEP 3: mapping")

subprocess.run([
"colmap","mapper",
"--database_path",f"{workspace}/database.db",
"--image_path",frames,
"--output_path",f"{workspace}/sparse"
])

print("STEP 4: undistorting")

subprocess.run([
"colmap","image_undistorter",
"--image_path",frames,
"--input_path",f"{workspace}/sparse/0",
"--output_path",f"{workspace}/dense",
"--output_type","COLMAP"
])

print("STEP 5: exporting point cloud")

subprocess.run([
"colmap","model_converter",
"--input_path",f"{workspace}/sparse/0",
"--output_path",f"{model}/model.ply",
"--output_type","PLY"
])

print("DONE")