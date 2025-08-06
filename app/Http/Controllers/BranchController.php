<?php

namespace App\Http\Controllers;

use App\Models\Branch;
use Illuminate\Http\Request;


class BranchController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        return Branch::all();
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        try {
            $validated = $request->validate([
                'store_name' => 'required|string|max:255',
                'branch_name' => 'required|string|max:255',
                'branch_description' => 'nullable|string|max:255',
                'status' => 'required|string|max:255',
            ]);

            $branch = new Branch();
            $branch->store_name = $validated['store_name'];
            $branch->branch_name = $validated['branch_name'];
            $branch->branch_description = $validated['branch_description'];
            $branch->status = $validated['status'];
            $branch->save();
            
            return response()->json($branch, 201);
        } catch (\Exception $e) {
            return response()->json(['error' => $e->getMessage()], 422);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(Branch $branch)
    {
        return $branch;
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(Branch $branch)
    {
        return $branch;
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, Branch $branch)
    {
        $branch->store_name = $request->store_name;
        $branch->branch_name = $request->branch_name;
        $branch->branch_description = $request->branch_description;
        $branch->status = $request->status;
        $branch->save();
        return response()->json($branch);
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(Branch $branch)
    {
        $branch->delete();
        return response()->json($branch);
    }
}
