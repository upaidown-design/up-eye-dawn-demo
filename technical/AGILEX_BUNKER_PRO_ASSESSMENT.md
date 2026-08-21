# AgileX BUNKER PRO assessment

Assessment date: 2026-08-16. Classification: `THIRD_PARTY_HARDWARE_REFERENCE` / `COMMERCIAL_BASE_PLATFORM`.

Official product information reports BUNKER PRO 2.0 with 120 kg payload, 150 min runtime, 1.5 m/s speed, IP67, tracked skid/spot turning, independent suspension, dual 1800 W drive, T-slot mounting, CAN and open-source SDK resources. Dimensions, battery voltage/capacity, mass, price, distributors, OEM terms, CAD and license terms require the current product manual or a supplier quotation before selection.

Software evidence must remain separated:

| Resource | Finding | Status |
|---|---|---|
| CAN / SDK | Official product page and UGV SDK ecosystem | CONFIRMED |
| ROS 1 / ROS 2 driver | Official AgileX index says Bunker packages support Bunker Pro | CONFIRMED |
| URDF / meshes | Not verified for the Pro model in scoped local sources | REVIEW_REQUIRED |
| Gazebo | Official `ugv_gazebo_sim` table explicitly marks BUNKER PRO unsupported | NOT_AVAILABLE_OFFICIALLY |
| Isaac Sim / USD | No BUNKER PRO resource verified | NOT_FOUND |
| STEP / STL / CAD | No licensed Pro CAD verified | NOT_FOUND |

Integration BOM still needed: base, compute, CAN interface/transceiver, power conversion, E-stop/safety, enclosure, GNSS/RTK, perception, probe mechanism, drone dock, harnessing and environmental validation. UP-EYE-DAWN ownership must be claimed only for its payload, sensing, autonomy, software, data and orchestration—not the AgileX chassis.

Official sources: <https://global.agilex.ai/products/bunker-pro>, <https://github.com/agilexrobotics/agilexrobotics>, <https://github.com/agilexrobotics/ugv_gazebo_sim>, <https://github.com/agilexrobotics/ugv_sdk>.
