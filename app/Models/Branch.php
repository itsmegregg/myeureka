<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Branch extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_name',
        'branch_description',
        'store_name',
        'status',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_name', 'store_name');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'branch_name', 'branch_name');
    }
}
