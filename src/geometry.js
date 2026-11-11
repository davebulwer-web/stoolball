// Geometry, in inches and seconds, from the brief.
// Flat side-on camera, no perspective. 0.75 px per inch vertically (and for
// sprite proportions); travel along the pitch is compressed to 0.427 px per inch.

export const W = 320, H = 180;
export const GROUND = 150;            // screen y of the ground line
export const PXI = 0.75;              // px per inch, vertical and sprite scale
export const PXX = 0.427;             // px per inch along the pitch
export const BW_SX = 268;             // batting wicket, screen x

export const PITCH = 576;             // 16 yards, wicket to wicket
export const DIST = 360;              // bowling crease to batting wicket (10 yards)
export const RUNUP = 216;             // the long run-up
export const REL_SX = BW_SX - DIST * PXX;            // release point, screen x
export const FAR_SX = BW_SX - PITCH * PXX;           // far wicket, screen x

export const G = 386;                 // gravity, in/s^2
export const H0 = 20;                 // release height, in

export const BOARD_LO = 44, BOARD_HI = 56;   // the board on the wicket
export const NOBALL_H = 24;                  // red mark on the upright
export const ZONE_MID = 330, ZONE_BACK = 60, HEIGHT_TOL = 13;
export const BAT_LO = 18, BAT_HI = 86;

// screen-space helpers
export const sy = h => GROUND - h * PXI;
export const sxFromRelease = xw => REL_SX + xw * PXX;   // ball travel, measured from release
export const sxFromFar = pos => FAR_SX + pos * PXX;     // runner position, measured from far wicket

// where people stand
export const KEEPER_SX = 288;
export const UMPIRE_SX = FAR_SX - 13;   // behind the far wicket
export const STRIKER_POS = PITCH - 30;    // 30in in front of the batting wicket
export const NONSTRIKER_POS = 30;         // 30in in front of the far wicket
export const BOWLER_FAR_SX = FAR_SX + 10; // where the bowler takes a throw at the far end
