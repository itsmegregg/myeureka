<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Header extends Model
{
    use HasFactory;

    protected $table = 'header';

    protected $fillable = [
        'store_name',
        'branch_name',
        'terminal_number',
        'si_number',
        'date',
        'time',
        'transaction_type',
        'void_flag',
        'guest_count',
        'male_count',
        'female_count',
        'guest_count_senior',
        'guest_count_pwd',
        'gross_amount',
        'net_amount',
        'vatable_sales',
        'vat_amount',
        'service_charge',
        'tip',
        'total_discount',
        'less_vat',
        'vat_exempt_sales',
        'zero_rated_sales',
        'delivery_charge',
        'other_charges',
        'cashier_name',
        'approved_by',
        'void_reason',
    ];

    protected $casts = [
        'date' => 'date',
        'time' => 'datetime:H:i:s',
        'delivery_charge' => 'decimal:2',
        'other_charges' => 'decimal:2',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_name', 'store_name');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_name', 'branch_name');
    }

    public function itemDetails(): HasMany
    {
        return $this->hasMany(ItemDetail::class, 'si_number', 'si_number');
    }

    public function paymentDetails(): HasMany
    {
        return $this->hasMany(PaymentDetail::class, 'si_number', 'si_number');
    }
}
