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
                'store_name' => 'Ramen Kuroda',
                'store_description' => 'Ramen Kuroda Store',
                'store_email' => 'ramen@ramen.com',
                'store_password' => 'ramen',
                'store_logo' => 'ramen.png',
                'active' => 'yes',
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }
}
