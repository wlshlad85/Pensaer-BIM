"""Test script for multi-element selection functionality."""
import sys
sys.path.insert(0, r'C:\Users\RICHARD\Pensaer-BIM\kernel\pensaer-geometry\.venv\Lib\site-packages')

import pensaer_geometry as pg

# Import state module directly (avoid __init__.py which imports mcp)
import importlib.util
spec = importlib.util.spec_from_file_location(
    "state",
    r"C:\Users\RICHARD\Pensaer-BIM\server\mcp-servers\geometry-server\geometry_server\state.py"
)
state_module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(state_module)
GeometryState = state_module.GeometryState


def test_basic_selection():
    """Test basic element selection."""
    print("=" * 60)
    print("Test 1: Basic selection")
    print("=" * 60)

    state = GeometryState()

    # Create some elements
    wall1 = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    wall2 = pg.create_wall((5, 0), (5, 5), height=3.0, thickness=0.2)
    wall3 = pg.create_wall((5, 5), (0, 5), height=3.0, thickness=0.2)
    floor = pg.create_floor((0, 0), (5, 5), thickness=0.3)

    w1_id = state.add_element(wall1, "wall")
    w2_id = state.add_element(wall2, "wall")
    w3_id = state.add_element(wall3, "wall")
    f_id = state.add_element(floor, "floor")

    print(f"  Created 3 walls and 1 floor")

    # Test replace selection
    result = state.select_elements([w1_id, w2_id], mode="replace")
    print(f"  Selected 2 walls (replace mode): {result['selected_count']} selected")
    assert result["selected_count"] == 2

    # Test add selection
    result = state.select_elements([w3_id], mode="add")
    print(f"  Added 1 wall (add mode): {result['selected_count']} selected")
    assert result["selected_count"] == 3

    # Test remove selection
    result = state.select_elements([w1_id], mode="remove")
    print(f"  Removed 1 wall (remove mode): {result['selected_count']} selected")
    assert result["selected_count"] == 2

    # Test toggle selection
    result = state.select_elements([w1_id, w2_id], mode="toggle")
    print(f"  Toggled 2 walls: {result['selected_count']} selected")
    # w1 was not selected, now selected; w2 was selected, now not selected
    # So: w1, w3 should be selected
    assert result["selected_count"] == 2

    print("  [PASS] Basic selection test passed!")
    return state


def test_selection_with_invalid_ids():
    """Test selection with invalid element IDs."""
    print("\n" + "=" * 60)
    print("Test 2: Selection with invalid IDs")
    print("=" * 60)

    state = GeometryState()

    # Create some elements
    wall = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    w_id = state.add_element(wall, "wall")

    # Try to select with invalid IDs
    result = state.select_elements([w_id, "invalid-id-1", "invalid-id-2"], mode="replace")

    print(f"  Selected with 2 invalid IDs: {result['selected_count']} selected")
    print(f"  Valid IDs: {len(result['valid_ids'])}")
    print(f"  Invalid IDs: {len(result['invalid_ids'])}")

    assert result["selected_count"] == 1
    assert len(result["invalid_ids"]) == 2

    print("  [PASS] Invalid ID handling test passed!")


def test_clear_selection():
    """Test clearing selection."""
    print("\n" + "=" * 60)
    print("Test 3: Clear selection")
    print("=" * 60)

    state = GeometryState()

    # Create and select elements
    wall1 = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    wall2 = pg.create_wall((5, 0), (5, 5), height=3.0, thickness=0.2)

    w1_id = state.add_element(wall1, "wall")
    w2_id = state.add_element(wall2, "wall")

    state.select_elements([w1_id, w2_id], mode="replace")
    print(f"  Selected 2 walls")

    count = state.clear_selection()
    print(f"  Cleared selection: {count} elements cleared")

    summary = state.get_selection_summary()
    print(f"  Selected count after clear: {summary['selected_count']}")

    assert count == 2
    assert summary["selected_count"] == 0

    print("  [PASS] Clear selection test passed!")


def test_selection_summary():
    """Test selection summary."""
    print("\n" + "=" * 60)
    print("Test 4: Selection summary")
    print("=" * 60)

    state = GeometryState()

    # Create mixed elements
    wall1 = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    wall2 = pg.create_wall((5, 0), (5, 5), height=3.0, thickness=0.2)
    floor = pg.create_floor((0, 0), (5, 5), thickness=0.3)
    room = pg.create_room("Living Room", "101", (0, 0), (5, 5), height=3.0)

    w1_id = state.add_element(wall1, "wall")
    w2_id = state.add_element(wall2, "wall")
    f_id = state.add_element(floor, "floor")
    r_id = state.add_element(room, "room")

    # Select all
    state.select_elements([w1_id, w2_id, f_id, r_id], mode="replace")

    summary = state.get_selection_summary()
    print(f"  Selected count: {summary['selected_count']}")
    print(f"  Elements by type: {summary['elements_by_type']}")

    assert summary["selected_count"] == 4
    assert summary["elements_by_type"]["wall"] == 2
    assert summary["elements_by_type"]["floor"] == 1
    assert summary["elements_by_type"]["room"] == 1

    print("  [PASS] Selection summary test passed!")


def test_groups():
    """Test group functionality."""
    print("\n" + "=" * 60)
    print("Test 5: Groups")
    print("=" * 60)

    state = GeometryState()

    # Create elements
    wall1 = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    wall2 = pg.create_wall((5, 0), (5, 5), height=3.0, thickness=0.2)
    wall3 = pg.create_wall((5, 5), (0, 5), height=3.0, thickness=0.2)
    wall4 = pg.create_wall((0, 5), (0, 0), height=3.0, thickness=0.2)

    w1_id = state.add_element(wall1, "wall")
    w2_id = state.add_element(wall2, "wall")
    w3_id = state.add_element(wall3, "wall")
    w4_id = state.add_element(wall4, "wall")

    # Create group
    group_id = state.create_group("Exterior Walls", [w1_id, w2_id, w3_id, w4_id])
    print(f"  Created group: {group_id[:8]}...")

    group = state.get_group(group_id)
    print(f"  Group name: {group['name']}")
    print(f"  Element count: {len(group['element_ids'])}")

    assert group["name"] == "Exterior Walls"
    assert len(group["element_ids"]) == 4

    # List groups
    groups = state.list_groups()
    print(f"  Total groups: {len(groups)}")
    assert len(groups) == 1

    # Add to group
    floor = pg.create_floor((0, 0), (5, 5), thickness=0.3)
    f_id = state.add_element(floor, "floor")

    state.add_to_group(group_id, [f_id])
    group = state.get_group(group_id)
    print(f"  After adding floor: {len(group['element_ids'])} elements")
    assert len(group["element_ids"]) == 5

    # Remove from group
    state.remove_from_group(group_id, [f_id])
    group = state.get_group(group_id)
    print(f"  After removing floor: {len(group['element_ids'])} elements")
    assert len(group["element_ids"]) == 4

    print("  [PASS] Groups test passed!")
    return state, group_id


def test_select_group():
    """Test selecting a group."""
    print("\n" + "=" * 60)
    print("Test 6: Select group")
    print("=" * 60)

    state = GeometryState()

    # Create elements
    wall1 = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    wall2 = pg.create_wall((5, 0), (5, 5), height=3.0, thickness=0.2)
    floor = pg.create_floor((0, 0), (5, 5), thickness=0.3)

    w1_id = state.add_element(wall1, "wall")
    w2_id = state.add_element(wall2, "wall")
    f_id = state.add_element(floor, "floor")

    # Create groups
    walls_group = state.create_group("Walls", [w1_id, w2_id])
    floor_group = state.create_group("Floors", [f_id])

    # Select walls group
    result = state.select_group(walls_group, mode="replace")
    print(f"  Selected walls group: {result['selected_count']} elements")
    assert result["selected_count"] == 2

    # Add floor group to selection
    result = state.select_group(floor_group, mode="add")
    print(f"  Added floor group: {result['selected_count']} elements")
    assert result["selected_count"] == 3

    print("  [PASS] Select group test passed!")


def test_delete_group():
    """Test deleting a group."""
    print("\n" + "=" * 60)
    print("Test 7: Delete group")
    print("=" * 60)

    state = GeometryState()

    # Create elements and group
    wall = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    w_id = state.add_element(wall, "wall")

    group_id = state.create_group("Test Group", [w_id])
    print(f"  Created group: {group_id[:8]}...")

    # Delete group
    success = state.delete_group(group_id)
    print(f"  Deleted group: {success}")
    assert success is True

    # Verify group is gone
    group = state.get_group(group_id)
    print(f"  Group after delete: {group}")
    assert group is None

    # Verify element still exists
    record = state.get_element(w_id)
    print(f"  Element still exists: {record is not None}")
    assert record is not None

    print("  [PASS] Delete group test passed!")


def test_state_summary():
    """Test state summary includes selection and groups."""
    print("\n" + "=" * 60)
    print("Test 8: State summary")
    print("=" * 60)

    state = GeometryState()

    # Create elements
    wall = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    w_id = state.add_element(wall, "wall")

    # Select and group
    state.select_elements([w_id], mode="replace")
    state.create_group("Test", [w_id])

    summary = state.to_summary()
    print(f"  Total elements: {summary['total_elements']}")
    print(f"  Total selected: {summary['total_selected']}")
    print(f"  Total groups: {summary['total_groups']}")

    assert summary["total_elements"] == 1
    assert summary["total_selected"] == 1
    assert summary["total_groups"] == 1

    print("  [PASS] State summary test passed!")


def main():
    """Run all selection tests."""
    print("\n" + "=" * 60)
    print("  PENSAER MULTI-ELEMENT SELECTION TESTS")
    print("=" * 60)

    try:
        test_basic_selection()
        test_selection_with_invalid_ids()
        test_clear_selection()
        test_selection_summary()
        test_groups()
        test_select_group()
        test_delete_group()
        test_state_summary()

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
