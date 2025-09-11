<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Create multiple users
        User::insert([
            [
                'id' => 1,
                'name' => 'Gregg Fuentes',
                'email' => 'gregg@gregg.com',
                'password' => Hash::make('123456789'),
                'created_at' => now(),
                'updated_at' => now(),
                'store_name' => 'My Eureka',
               
            ],
            [
                'id' => 2,
                'name' => 'Jon Villanueva',
                'email' => 'jon@jon.com',
                'password' => Hash::make('123456789'),
                'created_at' => now(),
                'updated_at' => now(),
                'store_name' => 'My Eureka',
            ]
        ]);
    }
}
