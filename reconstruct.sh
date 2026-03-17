#!/bin/bash

echo "Cleaning old data..."

rm -rf workspace
mkdir -p workspace/sparse

echo "STEP 1: Feature Extraction"

colmap feature_extractor \
--database_path workspace/database.db \
--image_path frames \
--ImageReader.camera_model SIMPLE_PINHOLE \
--ImageReader.single_camera 1

echo "STEP 2: Sequential Matching"

colmap sequential_matcher \
--database_path workspace/database.db \
--SequentialMatching.overlap 20

echo "STEP 3: Sparse Reconstruction"

colmap mapper \
--database_path workspace/database.db \
--image_path frames \
--output_path workspace/sparse \
--Mapper.min_num_matches 10 \
--Mapper.init_min_tri_angle 4 \
--Mapper.multiple_models 0

echo "CHECKING OUTPUT..."

ls workspace/sparse/0

echo "DONE: Ready for Gaussian training"