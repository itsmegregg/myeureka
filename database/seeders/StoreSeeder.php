<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class StoreSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Using updateOrInsert to handle existing records
        DB::table('stores')->updateOrInsert(
            ['id' => 2],
            [
                'store_name' => 'MYEUREKA PH OPC',
                'store_description' => 'MYEUREKA PH OPC Store',
                'store_email' => 'myeureka@myeureka.com',
                'store_logo' => 'myeureka.png',
                'active' => 'yes',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );
    }
}
