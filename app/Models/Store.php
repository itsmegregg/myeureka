<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Store extends Model
{
    use HasFactory;

    protected $primaryKey = 'store_name';
    public $incrementing = false;
    protected $keyType = 'string';

    protected $fillable = [
        'store_name',
        'store_description',
        'store_email',
        'store_password',
        'store_logo',
        'features',
        'active',
    ];

    protected $casts = [
        'features' => 'array',
        'active' => 'string',
    ];

    protected $hidden = [
        'store_password',
    ];

    public function users(): HasMany
    {
        return $this->hasMany(User::class, 'store_name', 'store_name');
    }

    public function branches(): HasMany
    {
        return $this->hasMany(Branch::class, 'store_name', 'store_name');
    }

    public function categories(): HasMany
    {
        return $this->hasMany(Category::class, 'store_name', 'store_name');
    }

    public function products(): HasMany
    {
        return $this->hasMany(Product::class, 'store_name', 'store_name');
    }
}
