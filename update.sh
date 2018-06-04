#!/bin/bash

git pull
cd api/examples/rocket && git pull && cd ../../../
cd app  && git pull && npm run build && cd ../
echo "Complete!"
