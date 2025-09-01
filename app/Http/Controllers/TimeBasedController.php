<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TimeBasedController extends Controller
{
    public function getTimeBasedReport(Request $request)
    {
        $request->validate([
            'from_date' => 'required|date',
            'to_date' => 'required|date|after_or_equal:from_date',
            'branch_name' => 'nullable|string',
        ]);

        $fromDate = $request->input('from_date');
        $toDate = $request->input('to_date');
        $branchName = $request->input('branch_name', 'ALL');

        $query = DB::table('header')
            ->select(
                DB::raw('EXTRACT(HOUR FROM time) as hour_of_day'),
                DB::raw('SUM(CAST(guest_count AS INTEGER)) as total_guests'),
                DB::raw('transaction_type, COUNT(transaction_type) as transaction_count')
            )
            ->whereBetween('date', [$fromDate, $toDate])
            ->where('void_flag', '!=', 'V')
            ->groupBy('hour_of_day', 'transaction_type')
            ->orderBy('hour_of_day', 'asc');

        if ($branchName !== 'ALL') {
            $query->where('branch_name', $branchName);
        }

        $results = $query->get();

        $report = [];
        foreach ($results as $result) {
            $hour = $result->hour_of_day;
            if (!isset($report[$hour])) {
                $report[$hour] = [
                    'hour' => sprintf('%02d:00 - %02d:59', $hour, $hour),
                    'total_guests' => 0,
                    'transactions' => [],
                ];
            }
            $report[$hour]['total_guests'] += (int)$result->total_guests;
            $report[$hour]['transactions'][] = [
                'type' => $result->transaction_type,
                'count' => $result->transaction_count,
            ];
        }

        // Consolidate total guests and pivot transaction types
        $finalReport = [];
        foreach ($report as $hourData) {
            $consolidated = [
                'hour' => $hourData['hour'],
                'total_guests' => $hourData['total_guests'],
            ];
            $transactionCounts = [];
            foreach ($hourData['transactions'] as $transaction) {
                $transactionCounts[$transaction['type']] = $transaction['count'];
            }
            $finalReport[] = array_merge($consolidated, $transactionCounts);
        }

        return response()->json(['data' => array_values($finalReport)]);
    }
}

