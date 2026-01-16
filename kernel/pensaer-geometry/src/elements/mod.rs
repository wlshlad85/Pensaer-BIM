//! BIM element types for the geometry kernel.
//!
//! This module contains all the parametric BIM elements:
//! - [`Wall`] - Walls with baselines, openings, and join support
//! - [`Floor`] - Floor slabs with polygon boundaries and holes
//! - [`Roof`] - Roof elements with various slope types
//! - [`Door`] - Doors hosted in walls
//! - [`Window`] - Windows hosted in walls
//! - [`Room`] - Room spaces bounded by walls

mod floor;
mod opening;
mod roof;
mod room;
mod wall;

pub use wall::{OpeningType, Wall, WallBaseline, WallOpening, WallType};

pub use floor::{Floor, FloorType};

pub use roof::{RidgeDirection, Roof, RoofType};

pub use opening::{Door, DoorSwing, DoorType, Window, WindowType};

pub use room::Room;
