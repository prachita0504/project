#!/bin/bash

set -e

PROJECT=/var/project/project
FRAMES=$PROJECT/frames
WORKSPACE=$PROJECT/workspace
MODEL=$PROJECT/model
GAUSSIAN=$PROJECT/gaussian-splatting

echo "STEP 1: COLMAP feature extraction"

colmap feature_extractor \
 --database_path $WORKSPACE/database.db \
 --image_path $FRAMES \
 --ImageReader.camera_model SIMPLE_RADIAL

echo "STEP 2: Matching"

colmap sequential_matcher \
 --database_path $WORKSPACE/database.db

echo "STEP 3: Mapping"

mkdir -p $WORKSPACE/sparse

colmap mapper \
 --database_path $WORKSPACE/database.db \
 --image_path $FRAMES \
 --output_path $WORKSPACE/sparse

echo "STEP 4: Undistorting images"

colmap image_undistorter \
 --image_path $FRAMES \
 --input_path $WORKSPACE/sparse/0 \
 --output_path $WORKSPACE/undistorted \
 --output_type COLMAP

echo "STEP 5: Gaussian training"

source ~/miniconda3/etc/profile.d/conda.sh
conda activate gaussian

cd $GAUSSIAN

python train.py \
 -s $WORKSPACE/undistorted \
 -m $MODEL

echo "Pipeline finished"