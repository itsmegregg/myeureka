<?php

namespace App\Http\Controllers;


use Illuminate\Http\Request;
use App\Models\PaymentDetail;
use App\Http\Resources\PaymentDetailsResource;
use App\Http\Resources\PaymentDetailsCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class PaymentDetailsController extends Controller
{
    public function getPaymentData(Request $request)
    {
       $validator = Validator::make($request->all(), [
           'branch_name' => 'nullable|string',
           'store_name' => 'nullable|string',
           'terminal_number' => 'nullable|string',
           'from_date' => 'required|date',
           'to_date' => 'required|date'
       ]);

       if ($validator->fails()) {
           return response()->json([
               'status' => 'error',
               'message' => 'Validation failed',
               'errors' => $validator->errors()
           ], 422);
       }

       $fromDate = $request->input('from_date');
       $toDate = $request->input('to_date');

       $query = DB::table('payment_details as pd')
           ->select(
               'pd.payment_type',
               'h.date',
               DB::raw('sum(CAST(pd.amount AS NUMERIC)) as "Total Amount"')
           )
           ->join('header as h', function ($join) use ($request) {
               $join->on('pd.si_number', '=', 'h.si_number')
                   ->on('pd.terminal_number', '=', 'h.terminal_number')
                   ->on('pd.branch_name', '=', 'h.branch_name')
                   ->when($request->filled('terminal_number') && strtoupper($request->terminal_number) !== 'ALL', function ($query) use ($request) {
                       $query->where('h.terminal_number', $request->terminal_number);
                   });
           })
           ->whereBetween('h.date', [$fromDate, $toDate]);

       if ($request->filled('store_name') && strtoupper($request->store_name) !== 'ALL') {
           $query->where('h.store_name', $request->store_name);
       }

       if ($request->filled('branch_name') && strtoupper($request->branch_name) !== 'ALL') {
           $query->where('h.branch_name', $request->branch_name);
       }

       $paymentData = $query->groupBy('pd.payment_type', 'h.date')
           ->orderBy('h.date')
           ->orderBy('pd.payment_type')
           ->get();

       return response()->json([
           'status' => 'success',
           'data' => $paymentData
       ]);
    }

    public function paymentList()
    {
        try{
            $paymentList = DB::table('payment_details')->select('payment_type')->distinct()->get();
            return response()->json([
                'status' => 'success',
                'data' => $paymentList
            ]);
        }catch(Exception $e){
            return response()->json([
                'status' => 'error',
                'message' => 'An error occurred while processing your request',
                'error' => $e->getMessage()
            ], 500);
        }
    }
}
