import React, { useState } from 'react';
import { ActivityIndicator, FlatList, SafeAreaView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

type Trip = { id:number|string; origin:string; destination:string; date:string; departureTime:string; arrivalTime:string; availableSeats:number; baseFare:number; status:string };
const API = process.env.EXPO_PUBLIC_API_URL ?? 'http://127.0.0.1:8000/api/v1';

export default function App(){
  const [origin,setOrigin]=useState('');
  const [destination,setDestination]=useState('');
  const [trips,setTrips]=useState<Trip[]>([]);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const search=async()=>{
    setLoading(true);setError('');
    try{
      const url=`${API}/trips/search?origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&passengers=1`;
      const response=await fetch(url,{headers:{Accept:'application/json'}});
      const payload=await response.json();
      if(!response.ok) throw new Error(payload?.message ?? `API ${response.status}`);
      setTrips(Array.isArray(payload.data)?payload.data:[]);
    }catch(e){setTrips([]);setError(e instanceof Error?e.message:'Unable to load trips.');}
    finally{setLoading(false);}
  };
  return <SafeAreaView style={s.safe}><View style={s.wrap}>
    <Text style={s.brand}>Encore Passenger</Text><Text style={s.title}>Real trip search</Text>
    <TextInput style={s.input} placeholder="Origin" value={origin} onChangeText={setOrigin}/>
    <TextInput style={s.input} placeholder="Destination" value={destination} onChangeText={setDestination}/>
    <TouchableOpacity style={s.button} onPress={search} disabled={loading}><Text style={s.buttonText}>{loading?'Searching...':'Search trips'}</Text></TouchableOpacity>
    {loading&&<ActivityIndicator/>}{!!error&&<Text style={s.error}>{error}</Text>}
    <FlatList data={trips} keyExtractor={(x:Trip)=>String(x.id)} ListEmptyComponent={!loading&&!error?<Text style={s.empty}>No departures found.</Text>:null} renderItem={({item}:{item:Trip})=><View style={s.card}><Text style={s.cardTitle}>{item.origin} → {item.destination}</Text><Text>{item.date} · {item.departureTime} - {item.arrivalTime}</Text><Text>{item.availableSeats} seats · DOP {item.baseFare}</Text><Text>Status: {item.status}</Text></View>}/>
  </View></SafeAreaView>;
}
const s=StyleSheet.create({safe:{flex:1,backgroundColor:'#f3f7f9'},wrap:{flex:1,padding:24,gap:12},brand:{fontWeight:'800',color:'#147ca9'},title:{fontSize:30,fontWeight:'800',marginBottom:8},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d9e4eb',borderRadius:14,padding:14},button:{backgroundColor:'#147ca9',padding:15,borderRadius:14,alignItems:'center'},buttonText:{color:'#fff',fontWeight:'800'},error:{color:'#a83232'},empty:{color:'#6e7f8e',paddingVertical:24},card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d9e4eb',borderRadius:16,padding:16,marginTop:10,gap:5},cardTitle:{fontWeight:'800',fontSize:17}});
