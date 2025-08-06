<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DSR extends Model
{
    protected $table = 'dsr';

    protected $primaryKey = ['date', 'branch_name', 'store_name', 'terminal_no'];
    public $incrementing = false;

    protected $fillable = [
        'date',
        'branch_name',
        'store_name',
        'terminal_no',
        'si_from',
        'si_to',
        'old_grand_total',
        'new_grand_total',
        'number_of_transactions',
        'number_of_guests',
        'total_service_charge',
        'total_gross_sales',
        'total_net_sales_after_void',
        'total_void_amount',
        'PWD_Discount',
        'Senior_Discount',
        'National_Athletes_Discount',
        'Solo_Parent_Discount',
        'Valor_Discount',
        'Other_Discounts',
        'z_read_counter',
    ];

    protected $casts = [
        'date' => 'date',
        'old_grand_total' => 'decimal:2',
        'new_grand_total' => 'decimal:2',
        'total_service_charge' => 'decimal:2',
        'total_gross_sales' => 'decimal:2',
        'total_net_sales_after_void' => 'decimal:2',
        'total_void_amount' => 'decimal:2',
        'PWD_Discount' => 'decimal:2',
        'Senior_Discount' => 'decimal:2',
        'National_Athletes_Discount' => 'decimal:2',
        'Solo_Parent_Discount' => 'decimal:2',
        'Valor_Discount' => 'decimal:2',
        'Other_Discounts' => 'decimal:2',
        'number_of_transactions' => 'integer',
        'number_of_guests' => 'integer',
    ];

    public $timestamps = false;
}
