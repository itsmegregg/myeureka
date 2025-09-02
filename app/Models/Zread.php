<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Zread extends Model
{
    protected $table = 'zread';
    protected $fillable = [
        'date',
        'branch_name',
        'file_path',
        'file_content',
        'file_name',
        'mime_type',
    ];

    protected $casts = [
        'date' => 'date:Y-m-d',
    ];
}
