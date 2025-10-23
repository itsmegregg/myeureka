<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $storeName = DB::table('stores')->value('store_name');

        if (!$storeName) {
            $this->command->info('No stores found. Please run StoreSeeder first.');
            return;
        }

        DB::table('branches')->insert([
            [
                'branch_name' => 'MYEUREKA TRINOMA',
                'branch_description' => 'MYEUREKA TRINOMA',
                'store_name' => 'MYEUREKA PH OPC',
                'status' => 'active',
                'created_at' => '2025-08-20 08:25:17',
                'updated_at' => '2025-08-20 08:25:17',
            ],
            [
                'branch_name' => 'MYEUREKA PH OPC',
                'branch_description' => 'MYEUREKA SM MEGAMALL',
                'store_name' => 'MYEUREKA PH OPC',
                'status' => 'active',
                'created_at' => '2025-08-20 11:45:36',
                'updated_at' => '2025-08-20 11:45:36',
            ],
                   [
                'branch_name' => 'MYEUREKA SM NORTH',
                'branch_description' => 'MYEUREKA SM NORTH',
                'store_name' => 'MYEUREKA PH OPC',
                'status' => 'active',
                'created_at' => '2025-08-20 11:45:36',
                'updated_at' => '2025-08-20 11:45:36',
            ],
         
        ]);
    }
}
