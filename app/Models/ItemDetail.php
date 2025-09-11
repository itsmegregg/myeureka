<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ItemDetail extends Model
{
    use HasFactory;

    protected $fillable = [
        'terminal_number',
        'si_number',
        'product_code',
        'description',
        'category_code',
        'category_description',
        'qty',
        'net_total',
        'menu_price',
        'discount_code',
        'discount_amount',
        'combo_header',
        'void_flag',
        'void_amount',
        'branch_name',
        'store_name',
        'line_number',
    ];

    protected $casts = [
        'discount_amount' => 'decimal:2',
        'void_amount' => 'decimal:2',
        'menu_price' => 'decimal:2',
        'net_total' => 'decimal:2',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_name', 'store_name');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_name', 'branch_name');
    }

    public function header(): BelongsTo
    {
        return $this->belongsTo(Header::class, 'si_number', 'si_number');
    }
}
