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
        DB::table('stores')->insert([
            [
                'id' => 100,
                'store_name' => 'MYEUREKA PH OPC',
                'store_description' => 'MYEUREKA PH OPC',
                'store_email' => 'myeureka@myeureka.com',
                'store_logo' => 'myeureka.png',
                'active' => 'yes',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}