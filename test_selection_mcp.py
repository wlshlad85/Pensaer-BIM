"""Test script for MCP Selection Tools.

Tests the selection MCP tools via direct function calls.
"""
import sys
sys.path.insert(0, r'C:\Users\RICHARD\Pensaer-BIM\kernel\pensaer-geometry\.venv\Lib\site-packages')
sys.path.insert(0, r'C:\Users\RICHARD\Pensaer-BIM\server\mcp-servers\geometry-server')

import asyncio
import json


async def test_selection_mcp_tools():
    """Test all selection MCP tools."""
    print("=" * 60)
    print("  PENSAER SELECTION MCP TOOLS TEST")
    print("=" * 60)

    # Import after path setup
    from geometry_server.state import get_state, reset_state
    import pensaer_geometry as pg

    # Reset state for clean test
    reset_state()
    state = get_state()

    # Create test elements
    print("\n[1] Creating test elements...")
    wall1 = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    wall2 = pg.create_wall((5, 0), (5, 5), height=3.0, thickness=0.2)
    wall3 = pg.create_wall((5, 5), (0, 5), height=3.0, thickness=0.2)
    wall4 = pg.create_wall((0, 5), (0, 0), height=3.0, thickness=0.2)
    floor1 = pg.create_floor((0, 0), (5, 5), thickness=0.3)
    room1 = pg.create_room("Office", "101", (0, 0), (5, 5), height=3.0)

    w1_id = state.add_element(wall1, "wall")
    w2_id = state.add_element(wall2, "wall")
    w3_id = state.add_element(wall3, "wall")
    w4_id = state.add_element(wall4, "wall")
    f1_id = state.add_element(floor1, "floor")
    r1_id = state.add_element(room1, "room")

    print(f"    Created 4 walls, 1 floor, 1 room")
    print(f"    Wall IDs: {w1_id[:8]}..., {w2_id[:8]}..., {w3_id[:8]}..., {w4_id[:8]}...")

    # Test 1: Select elements (replace mode)
    print("\n[2] Testing select_elements (replace mode)...")
    result = state.select_elements([w1_id, w2_id], mode="replace")
    assert result["selected_count"] == 2, f"Expected 2, got {result['selected_count']}"
    print(f"    [PASS] Selected 2 walls")

    # Test 2: Select elements (add mode)
    print("\n[3] Testing select_elements (add mode)...")
    result = state.select_elements([w3_id], mode="add")
    assert result["selected_count"] == 3, f"Expected 3, got {result['selected_count']}"
    print(f"    [PASS] Added 1 wall, total: 3")

    # Test 3: Select elements (remove mode)
    print("\n[4] Testing select_elements (remove mode)...")
    result = state.select_elements([w1_id], mode="remove")
    assert result["selected_count"] == 2, f"Expected 2, got {result['selected_count']}"
    print(f"    [PASS] Removed 1 wall, total: 2")

    # Test 4: Select elements (toggle mode)
    print("\n[5] Testing select_elements (toggle mode)...")
    result = state.select_elements([w1_id, w2_id], mode="toggle")
    # w1 was not selected, now selected; w2 was selected, now not
    # After: w1, w3 should be selected
    assert result["selected_count"] == 2, f"Expected 2, got {result['selected_count']}"
    print(f"    [PASS] Toggled, total: 2")

    # Test 5: Get selection summary
    print("\n[6] Testing get_selection_summary...")
    summary = state.get_selection_summary()
    assert summary["selected_count"] == 2
    assert "wall" in summary["elements_by_type"]
    print(f"    [PASS] Summary: {summary['selected_count']} selected, types: {summary['elements_by_type']}")

    # Test 6: Clear selection
    print("\n[7] Testing clear_selection...")
    count = state.clear_selection()
    assert count == 2, f"Expected 2 cleared, got {count}"
    summary = state.get_selection_summary()
    assert summary["selected_count"] == 0
    print(f"    [PASS] Cleared {count} elements")

    # Test 7: Select by type (simulated)
    print("\n[8] Testing select_by_type simulation...")
    # Get all walls
    wall_ids = [r.id for r in state.list_elements(category="wall")]
    result = state.select_elements(wall_ids, mode="replace")
    assert result["selected_count"] == 4, f"Expected 4 walls, got {result['selected_count']}"
    print(f"    [PASS] Selected all 4 walls by type")

    # Test 8: Create group
    print("\n[9] Testing create_group...")
    state.clear_selection()
    group_id = state.create_group("Exterior Walls", [w1_id, w2_id, w3_id, w4_id])
    group = state.get_group(group_id)
    assert group is not None
    assert group["name"] == "Exterior Walls"
    assert len(group["element_ids"]) == 4
    print(f"    [PASS] Created group '{group['name']}' with {len(group['element_ids'])} elements")

    # Test 9: Add to group
    print("\n[10] Testing add_to_group...")
    success = state.add_to_group(group_id, [f1_id])
    assert success
    group = state.get_group(group_id)
    assert len(group["element_ids"]) == 5
    print(f"    [PASS] Added floor to group, total: {len(group['element_ids'])}")

    # Test 10: Remove from group
    print("\n[11] Testing remove_from_group...")
    success = state.remove_from_group(group_id, [f1_id])
    assert success
    group = state.get_group(group_id)
    assert len(group["element_ids"]) == 4
    print(f"    [PASS] Removed floor from group, total: {len(group['element_ids'])}")

    # Test 11: List groups
    print("\n[12] Testing list_groups...")
    groups = state.list_groups()
    assert len(groups) == 1
    print(f"    [PASS] Found {len(groups)} group(s)")

    # Test 12: Select group
    print("\n[13] Testing select_group...")
    result = state.select_group(group_id, mode="replace")
    assert result["selected_count"] == 4
    print(f"    [PASS] Selected group with {result['selected_count']} elements")

    # Test 13: Create second group and test group selection modes
    print("\n[14] Testing multi-group selection...")
    floor_group_id = state.create_group("Floors", [f1_id])
    result = state.select_group(floor_group_id, mode="add")
    assert result["selected_count"] == 5  # 4 walls + 1 floor
    print(f"    [PASS] Added floor group, total: {result['selected_count']}")

    # Test 14: Delete group
    print("\n[15] Testing delete_group...")
    success = state.delete_group(floor_group_id)
    assert success
    group = state.get_group(floor_group_id)
    assert group is None
    # Element should still exist
    record = state.get_element(f1_id)
    assert record is not None
    print(f"    [PASS] Deleted group, element still exists")

    # Test 15: Invalid ID handling
    print("\n[16] Testing invalid ID handling...")
    result = state.select_elements(["invalid-id-1", "invalid-id-2", w1_id], mode="replace")
    assert result["selected_count"] == 1
    assert len(result["invalid_ids"]) == 2
    print(f"    [PASS] Handled invalid IDs: {len(result['invalid_ids'])} invalid, {result['selected_count']} valid")

    # Test 16: State summary includes selection and groups
    print("\n[17] Testing state summary...")
    summary = state.to_summary()
    assert "total_selected" in summary
    assert "total_groups" in summary
    assert summary["total_elements"] == 6
    print(f"    [PASS] State: {summary['total_elements']} elements, "
          f"{summary['total_selected']} selected, {summary['total_groups']} groups")

    print("\n" + "=" * 60)
    print("  ALL MCP SELECTION TESTS PASSED! [PASS]")
    print("=" * 60)


async def test_mcp_tool_dispatch():
    """Test the actual MCP tool dispatch for selection."""
    print("\n" + "=" * 60)
    print("  TESTING MCP TOOL DISPATCH")
    print("=" * 60)

    from geometry_server.state import reset_state, get_state
    from geometry_server.geometry_mcp import call_tool
    import pensaer_geometry as pg

    reset_state()
    state = get_state()

    # Create test elements via state directly
    wall1 = pg.create_wall((0, 0), (5, 0), height=3.0, thickness=0.2)
    wall2 = pg.create_wall((5, 0), (5, 5), height=3.0, thickness=0.2)
    w1_id = state.add_element(wall1, "wall")
    w2_id = state.add_element(wall2, "wall")

    print(f"\n[1] Created 2 walls: {w1_id[:8]}..., {w2_id[:8]}...")

    # Test calling select_elements via the call_tool function directly
    print("\n[2] Testing MCP select_elements dispatch...")
    result = await call_tool(
        "select_elements",
        {"element_ids": [w1_id, w2_id], "mode": "replace"}
    )
    print(f"    Result type: {type(result)}")
    if result:
        # Parse the JSON response
        response_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
        response = json.loads(response_text)
        if response.get("success"):
            print(f"    [PASS] Selected {response['data']['selected_count']} elements")
            assert response['data']['selected_count'] == 2
        else:
            print(f"    [FAIL] Error: {response.get('error')}")
            raise AssertionError(f"select_elements failed: {response}")

    print("\n[3] Testing MCP get_selection dispatch...")
    result = await call_tool("get_selection", {})
    if result:
        response_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
        response = json.loads(response_text)
        if response.get("success"):
            print(f"    [PASS] Selection: {response['data']['selected_count']} elements")
            assert response['data']['selected_count'] == 2
        else:
            print(f"    [FAIL] Error: {response.get('error')}")
            raise AssertionError(f"get_selection failed: {response}")

    print("\n[4] Testing MCP clear_selection dispatch...")
    result = await call_tool("clear_selection", {})
    if result:
        response_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
        response = json.loads(response_text)
        if response.get("success"):
            print(f"    [PASS] Cleared {response['data']['cleared_count']} elements")
            assert response['data']['cleared_count'] == 2
        else:
            print(f"    [FAIL] Error: {response.get('error')}")
            raise AssertionError(f"clear_selection failed: {response}")

    print("\n[5] Testing MCP create_group dispatch...")
    result = await call_tool(
        "create_group",
        {"name": "Test Walls", "element_ids": [w1_id, w2_id]}
    )
    if result:
        response_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
        response = json.loads(response_text)
        if response.get("success"):
            group_id = response['data']['group_id']
            print(f"    [PASS] Created group: {group_id[:8]}...")
        else:
            print(f"    [FAIL] Error: {response.get('error')}")
            raise AssertionError(f"create_group failed: {response}")

    print("\n[6] Testing MCP select_group dispatch...")
    result = await call_tool(
        "select_group",
        {"group_id": group_id, "mode": "replace"}
    )
    if result:
        response_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
        response = json.loads(response_text)
        if response.get("success"):
            print(f"    [PASS] Selected group with {response['data']['selected_count']} elements")
            assert response['data']['selected_count'] == 2
        else:
            print(f"    [FAIL] Error: {response.get('error')}")
            raise AssertionError(f"select_group failed: {response}")

    print("\n[7] Testing MCP list_groups dispatch...")
    result = await call_tool("list_groups", {})
    if result:
        response_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
        response = json.loads(response_text)
        if response.get("success"):
            print(f"    [PASS] Found {len(response['data']['groups'])} group(s)")
            assert len(response['data']['groups']) == 1
        else:
            print(f"    [FAIL] Error: {response.get('error')}")
            raise AssertionError(f"list_groups failed: {response}")

    print("\n[8] Testing MCP select_by_type dispatch...")
    result = await call_tool(
        "select_by_type",
        {"element_type": "wall", "mode": "replace"}
    )
    if result:
        response_text = result[0].text if hasattr(result[0], 'text') else str(result[0])
        response = json.loads(response_text)
        if response.get("success"):
            print(f"    [PASS] Selected {response['data']['selected_count']} walls by type")
            assert response['data']['selected_count'] == 2
        else:
            print(f"    [FAIL] Error: {response.get('error')}")
            raise AssertionError(f"select_by_type failed: {response}")

    print("\n" + "=" * 60)
    print("  ALL MCP DISPATCH TESTS PASSED! [PASS]")
    print("=" * 60)


async def main():
    """Run all tests."""
    try:
        await test_selection_mcp_tools()
        await test_mcp_tool_dispatch()
        return 0
    except Exception as e:
        print(f"\n[FAIL] TEST FAILED: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit(asyncio.run(main()))
