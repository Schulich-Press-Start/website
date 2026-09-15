# Handheld CAD Source

User supplied on 2026-09-15 and explicitly identified as the SPS handheld, not a robotic arm.

- Native source: `SPS V1 07.20.SLDPRT`, retained unchanged.
- Usable web export: `SPS_V1_07.20.gltf` and `SPS V1 07.20.bin`, exported by SolidWorks.
- The original standalone GLB was invalid: 9,124 total bytes with an empty BIN chunk despite declaring 194,736 geometry bytes. It is not used.
- The glTF companion binary contains the full declared 194,736 bytes. Asset preparation repackages these bytes into GLB without modifying positions, indices, normals or material assignments.
- Presentation may normalise position, scale, orientation, lighting and material appearance without modifying source geometry. Purple/orange materials are a labelled colour concept; a source-material view is available.
- No source CAD or member data is uploaded to an external conversion service.