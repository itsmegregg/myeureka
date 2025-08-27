<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailySummary extends Model
{
    use HasFactory;

    protected $table = 'daily_summary';

    protected $fillable = [
        'terminal_no',
        'date',
        'si_from',
        'si_to',
        'new_grand_total',
        'old_grand_total',
        'z_read_counter',
        'branch_name',
        'store_name',
    ];

    protected $casts = [
        'date' => 'date',
        'new_grand_total' => 'decimal:2',
        'old_grand_total' => 'decimal:2',
        'z_read_counter' => 'integer',
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
