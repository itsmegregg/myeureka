<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $primaryKey = 'category_code';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'category_code',
        'category_name',
        'category_description',
        'active',
        'store_name',
    ];

    protected $casts = [
        'active' => 'string',
    ];

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'store_name', 'store_name');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'category_code', 'category_code');
    }
}
