<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class BIRDetailed extends Model
{
    protected $table = 'bir_detailed';

    protected $primaryKey = ['date', 'branch_name', 'store_name', 'terminal_number', 'si_number'];
    public $incrementing = false;

    protected $fillable = [
        'date',
        'branch_name',
        'store_name',
        'terminal_number',
        'si_number',
        'vat_exempt_sales',
        'zero_rated_sales',
        'vat_amount',
        'less_vat',
        'gross_amount',
        'discount_code',
        'discount_amount',
        'net_total',
        'payment_type',
        'service_charge',
        'takeout_charge',
        'delivery_charge',
        'amount',
    ];

    protected $casts = [
        'date' => 'date',
        'vat_exempt_sales' => 'decimal:5',
        'zero_rated_sales' => 'decimal:5',
        'vat_amount' => 'decimal:5',
        'less_vat' => 'decimal:5',
        'gross_amount' => 'decimal:2',
        'discount_amount' => 'decimal:5',
        'net_total' => 'decimal:5',
        'service_charge' => 'decimal:5',
        'takeout_charge' => 'decimal:5',
        'delivery_charge' => 'decimal:5',
        'amount' => 'decimal:2',
    ];

    public $timestamps = false;
}
