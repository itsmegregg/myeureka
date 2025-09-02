<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Receipt extends Model
{
    use HasFactory;

    protected $table = 'receipts';

    protected $fillable = [
        'si_number',
        'file_path', // Will be removed in a future migration
        'file_content',
        'file_name',
        'mime_type',
        'date',
        'branch_name',
        'type',
    ];

    protected $casts = [
        'file_path' => 'string',
        'date' => 'date:Y-m-d',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];
    
    /**
     * Get the file content as a string
     */
    public function getFileContentAttribute($value)
    {
        if (is_resource($value)) {
            return stream_get_contents($value);
        }
        return $value;
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class, 'branch_name', 'branch_name');
    }
}
    