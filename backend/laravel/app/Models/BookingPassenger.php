<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
class BookingPassenger extends Model { protected $fillable=['booking_id','full_name','document_number','email','phone']; }
