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
                'store_name' => $storeName, 
                'branch_name' => 'MYEUREKA PH OPC',
                'branch_description' => 'MYEUREKA PH OPC',
                'created_at' => now(),
                'updated_at' => now(),
            ],
         
          
        ]); 
    }
}
