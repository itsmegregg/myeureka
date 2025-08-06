<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ItemDetailsDailySummary extends Model
{
    protected $table = 'item_details_daily_summary';

    protected $primaryKey = ['date', 'branch_name', 'store_name', 'category_code', 'product_code'];
    public $incrementing = false;

    protected $fillable = [
        'date',
        'branch_name',
        'store_name',
        'category_code',
        'product_code',
        'quantity',
        'net_sales',
    ];

    protected $casts = [
        'date' => 'date',
        'quantity' => 'decimal:2',
        'net_sales' => 'decimal:2',
    ];

    public $timestamps = false;
}
