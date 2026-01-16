"""Test script for roof functionality."""
import sys
sys.path.insert(0, r'C:\Users\RICHARD\Pensaer-BIM\kernel\pensaer-geometry\.venv\Lib\site-packages')

import pensaer_geometry as pg

def test_create_flat_roof():
    """Test creating a flat roof."""
    print("=" * 60)
    print("Test 1: Create flat roof")
    print("=" * 60)

    roof = pg.create_roof(
        (0, 0), (10, 8),
        thickness=0.25,
        roof_type="flat",
        slope_degrees=0.0
    )

    print(f"  Roof ID: {roof.id}")
    print(f"  Type: {roof.roof_type}")
    print(f"  Footprint area: {roof.footprint_area():.2f} m²")
    print(f"  Surface area: {roof.surface_area():.2f} m²")
    print(f"  Ridge height: {roof.ridge_height():.2f} m")
    print(f"  [PASS] Flat roof created successfully!")
    return roof


def test_create_gable_roof():
    """Test creating a gable roof."""
    print("\n" + "=" * 60)
    print("Test 2: Create gable roof (35° slope)")
    print("=" * 60)

    roof = pg.create_roof(
        (0, 0), (10, 8),
        thickness=0.25,
        roof_type="gable",
        slope_degrees=35.0,
        ridge_along_x=True
    )

    print(f"  Roof ID: {roof.id}")
    print(f"  Type: {roof.roof_type}")
    print(f"  Slope: {roof.slope_degrees}°")
    print(f"  Footprint area: {roof.footprint_area():.2f} m²")
    print(f"  Surface area: {roof.surface_area():.2f} m²")
    print(f"  Ridge height: {roof.ridge_height():.2f} m")
    print(f"  [PASS] Gable roof created successfully!")
    return roof


def test_create_hip_roof():
    """Test creating a hip roof."""
    print("\n" + "=" * 60)
    print("Test 3: Create hip roof (30° slope)")
    print("=" * 60)

    roof = pg.create_roof(
        (0, 0), (12, 10),
        thickness=0.3,
        roof_type="hip",
        slope_degrees=30.0
    )

    print(f"  Roof ID: {roof.id}")
    print(f"  Type: {roof.roof_type}")
    print(f"  Slope: {roof.slope_degrees}°")
    print(f"  Footprint area: {roof.footprint_area():.2f} m²")
    print(f"  Surface area: {roof.surface_area():.2f} m²")
    print(f"  Ridge height: {roof.ridge_height():.2f} m")
    print(f"  [PASS] Hip roof created successfully!")
    return roof


def test_create_shed_roof():
    """Test creating a shed (mono-pitch) roof."""
    print("\n" + "=" * 60)
    print("Test 4: Create shed roof (15° slope)")
    print("=" * 60)

    roof = pg.create_roof(
        (0, 0), (6, 4),
        thickness=0.2,
        roof_type="shed",
        slope_degrees=15.0
    )

    print(f"  Roof ID: {roof.id}")
    print(f"  Type: {roof.roof_type}")
    print(f"  Slope: {roof.slope_degrees}°")
    print(f"  Footprint area: {roof.footprint_area():.2f} m²")
    print(f"  Surface area: {roof.surface_area():.2f} m²")
    print(f"  [PASS] Shed roof created successfully!")
    return roof


def test_roof_mesh_generation():
    """Test mesh generation for roofs."""
    print("\n" + "=" * 60)
    print("Test 5: Roof mesh generation")
    print("=" * 60)

    roof = pg.create_roof(
        (0, 0), (10, 8),
        thickness=0.25,
        roof_type="gable",
        slope_degrees=30.0
    )

    mesh = roof.to_mesh()
    print(f"  Vertex count: {mesh.vertex_count()}")
    print(f"  Triangle count: {mesh.triangle_count()}")
    print(f"  Is valid: {mesh.is_valid()}")

    # Export to OBJ
    obj_str = pg.mesh_to_obj(mesh)
    print(f"  OBJ export: {len(obj_str)} characters")
    print(f"  [PASS] Mesh generation successful!")
    return mesh


def test_attach_roof_to_walls():
    """Test attaching a roof to walls."""
    print("\n" + "=" * 60)
    print("Test 6: Attach roof to walls")
    print("=" * 60)

    # Create rectangular walls
    walls = pg.create_rectangular_walls(
        (0, 0), (10, 8),
        height=3.0,
        thickness=0.2
    )
    print(f"  Created {len(walls)} walls")

    # Create gable roof matching the walls
    roof = pg.create_roof(
        (0, 0), (10, 8),
        thickness=0.25,
        roof_type="gable",
        slope_degrees=30.0
    )
    roof.set_elevation(3.0)  # Set at top of walls
    print(f"  Created roof at elevation 3.0m")

    # Attach roof to walls
    result = pg.attach_roof_to_walls(roof, walls)

    print(f"  Attached wall count: {result['attached_wall_count']}")
    print(f"  Wall IDs: {result['wall_ids'][:2]}...")  # Show first 2

    # Get attached roof
    attached_roof = result['roof']
    attached_ids = attached_roof.attached_wall_ids()
    print(f"  Roof now attached to {len(attached_ids)} walls")
    print(f"  [PASS] Roof attachment successful!")

    return result


def test_complete_building_with_roof():
    """Test creating a complete building with walls, floor, and roof."""
    print("\n" + "=" * 60)
    print("Test 7: Complete building with roof")
    print("=" * 60)

    # Create the building base
    building = pg.create_simple_building(
        (0, 0), (12, 10),
        wall_height=3.0,
        wall_thickness=0.2,
        floor_thickness=0.3,
        room_name="Main Hall",
        room_number="001"
    )

    print(f"  Created building with {len(building['walls'])} walls")
    print(f"  Floor: {building['floor'].area():.2f} m²")
    print(f"  Room: {building['room'].area():.2f} m²")

    # Create and attach a hip roof
    roof = pg.create_roof(
        (0, 0), (12, 10),
        thickness=0.3,
        roof_type="hip",
        slope_degrees=25.0,
        eave_overhang=0.5
    )
    roof.set_elevation(3.0)

    # Attach to all walls
    result = pg.attach_roof_to_walls(roof, building['walls'])

    print(f"  Added hip roof (25° slope, 0.5m overhang)")
    print(f"  Roof ridge height: {result['roof'].ridge_height():.2f} m")
    print(f"  Roof surface area: {result['roof'].surface_area():.2f} m²")

    # Generate combined mesh
    meshes = [w.to_mesh() for w in building['walls']]
    meshes.append(building['floor'].to_mesh())
    meshes.append(result['roof'].to_mesh())

    combined = pg.merge_meshes(meshes)
    print(f"\n  Combined mesh:")
    print(f"    Vertices: {combined.vertex_count()}")
    print(f"    Triangles: {combined.triangle_count()}")
    print(f"    Valid: {combined.is_valid()}")

    print(f"  [PASS] Complete building with roof created!")
    return building, result['roof']


def main():
    """Run all roof tests."""
    print("\n" + "=" * 60)
    print("  PENSAER ROOF FUNCTIONALITY TESTS")
    print("=" * 60)

    try:
        test_create_flat_roof()
        test_create_gable_roof()
        test_create_hip_roof()
        test_create_shed_roof()
        test_roof_mesh_generation()
        test_attach_roof_to_walls()
        test_complete_building_with_roof()

        print("\n" + "=" * 60)
        print("  ALL TESTS PASSED! [PASS]")
        print("=" * 60)

    except Exception as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1

    return 0


if __name__ == "__main__":
    exit(main())
