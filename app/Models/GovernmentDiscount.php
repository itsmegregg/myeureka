<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GovernmentDiscount extends Model
{
    use HasFactory;

    protected $table = 'government_discount';

    protected $fillable = [
        'branch_name',
        'store_name',
        'date',
        'si_number',
        'id_type',
        'id_no',
        'name',
        'gross_amount',
        'discount_amount',
    ];

    protected $casts = [
        'date' => 'date',
        'gross_amount' => 'decimal:2',
        'discount_amount' => 'decimal:2',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_name', 'store_name');
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_name', 'branch_name');
    }
}
