import subprocess
import os
import shutil

# ===== PATHS =====
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

frames = os.path.join(BASE_DIR, "../frames")
workspace = os.path.join(BASE_DIR, "../workspace")
model = os.path.join(BASE_DIR, "../model")

os.makedirs(workspace, exist_ok=True)
os.makedirs(model, exist_ok=True)

# ===== STEP 0: Copy images (REQUIRED for Gaussian) =====
print("STEP 0: Copying images...")

images_dest = os.path.join(workspace, "images")
os.makedirs(images_dest, exist_ok=True)

for file in os.listdir(frames):
    src = os.path.join(frames, file)
    dst = os.path.join(images_dest, file)
    if os.path.isfile(src) and not os.path.exists(dst):
        shutil.copy(src, dst)

# ===== STEP 1: Feature Extraction =====
print("STEP 1: Feature extraction...")

subprocess.run([
    "colmap", "feature_extractor",
    "--database_path", os.path.join(workspace, "database.db"),
    "--image_path", frames,
    "--ImageReader.single_camera", "1",
    "--ImageReader.camera_model", "SIMPLE_RADIAL",
    "--SiftExtraction.use_gpu", "1",
    "--SiftExtraction.max_num_features", "8000"
], check=True)

# ===== STEP 2: Matching (BEST for video) =====
print("STEP 2: Sequential matching...")

subprocess.run([
    "colmap", "sequential_matcher",
    "--database_path", os.path.join(workspace, "database.db"),
    "--SiftMatching.use_gpu", "1"
], check=True)

# ===== STEP 3: Mapping =====
print("STEP 3: Mapping...")

sparse_path = os.path.join(workspace, "sparse")
os.makedirs(sparse_path, exist_ok=True)

subprocess.run([
    "colmap", "mapper",
    "--database_path", os.path.join(workspace, "database.db"),
    "--image_path", frames,
    "--output_path", sparse_path,
    "--Mapper.init_min_tri_angle", "2",
    "--Mapper.min_num_matches", "8"
], check=True)

# ===== STEP 4: Undistortion =====
print("STEP 4: Undistorting images...")

dense_path = os.path.join(workspace, "dense")
os.makedirs(dense_path, exist_ok=True)

subprocess.run([
    "colmap", "image_undistorter",
    "--image_path", frames,
    "--input_path", os.path.join(sparse_path, "0"),
    "--output_path", dense_path,
    "--output_type", "COLMAP"
], check=True)

print("\n✅ RECONSTRUCTION COMPLETE — Ready for Gaussian Splatting")