#!/bin/bash

echo "Cleaning old data..."

rm -rf workspace
rm -rf dense
mkdir -p workspace/sparse
mkdir dense

echo "STEP 1: Feature Extraction"

colmap feature_extractor \
--database_path workspace/database.db \
--image_path frames \
--ImageReader.camera_model SIMPLE_RADIAL

echo "STEP 2: Sequential Matching"

colmap sequential_matcher \
--database_path workspace/database.db \
--SequentialMatching.overlap 20

echo "STEP 3: Sparse Reconstruction"

colmap mapper \
--database_path workspace/database.db \
--image_path frames \
--output_path workspace/sparse \
--Mapper.min_num_matches 5

echo "STEP 4: Undistort Images"

colmap image_undistorter \
--image_path frames \
--input_path workspace/sparse/0 \
--output_path dense \
--output_type COLMAP

echo "STEP 5: Patch Match Stereo"

colmap patch_match_stereo \
--workspace_path dense \
--workspace_format COLMAP \
--PatchMatchStereo.geom_consistency true

echo "STEP 6: Stereo Fusion"

colmap stereo_fusion \
--workspace_path dense \
--workspace_format COLMAP \
--input_type geometric \
--output_path dense/fused.ply

echo "STEP 7: Copy Model"

cp dense/fused.ply model/model.ply

echo "DONE: model saved at model/model.ply"