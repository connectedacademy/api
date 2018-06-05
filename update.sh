#!/bin/bash

git pull
cd api/examples/rocket && git pull origin latest && cd ../../../
cd app && git pull origin latest && npm run build && cd ../
echo "Complete!"