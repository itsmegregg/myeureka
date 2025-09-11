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
                'id' => 1,
                'store_name' => 'My Eureka',
                'store_description' => 'My Eureka Store',
                'store_email' => 'eureka@eureka.com',
                'store_logo' => 'eureka.png',
                'active' => 'yes',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
