# Rover 3D asset pipeline

Search order: owned CAD; licensed manufacturer CAD; URDF; meshes; open-source model; procedural concept. No suitable local CAD/URDF/mesh was found. Until licensing and geometry are verified, create only a `VISUAL SIMULATION MODEL — NOT FOR MANUFACTURING`.

Required nodes: `root`, `chassis`, `left_track`, `right_track`, `front_sensor_array`, `spectral_camera`, `antenna`, `probe_mount`, `probe_arm`, `probe_head`, `probe_pins`, `top_bay`, `top_bay_door`, `drone_platform`, `drone`, `status_lights`.

Pipeline must be scripted and reproducible: import/clean, consistent axes and units, pivots, articulated separation, PBR materials, LODs, GLB export, validation, turntable and manifest update. Dimensions remain nullable configuration values until verified.
