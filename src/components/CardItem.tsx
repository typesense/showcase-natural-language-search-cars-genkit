import { _CarSchemaResponse } from '@/schemas/typesense';
import { Badge } from './ui/badge';
import { USD_Formatter } from '@/utils/utils';

export default function CardItem({ car }: { car: _CarSchemaResponse }) {
  return (
    <li className='border-2 border-gray-700 rounded-xl py-4 px-5 flex flex-col gap-2'>
      <div>
        <div className='text-xs mb-0.5 flex items-center gap-1.5'>
          {car.year} <span className='text-[10px]'>|</span>
          {car.vehicle_style}
        </div>
        <div className='flex items-center gap-2'>
          <h2 className='font-bold text-xl'>
            {car.manufacturer} {car.model}
          </h2>
          <Badge className='text-[10px] font-light'>{car.vehicle_size}</Badge>
        </div>
      </div>
      <div className='font-normal text-sm'>
        <div>{car.driven_wheels}</div>
        <div>
          Engine: V{car.engine_cylinders} - {car.engine_hp}HPs
        </div>
        <div>Fuel type: {car.engine_fuel_type}</div>
        <div>Number of doors: {car.number_of_doors}</div>
        <div>{car.transmission_type}</div>
      </div>
      <div className='flex justify-between text-lg'>
        <div className='flex flex-col'>
          <span>{USD_Formatter.format(car.msrp)}</span>
          <span className='text-[10px] leading-tight'>Starting MSRP</span>
        </div>
        <div className='flex flex-col'>
          <span>
            {car.city_mpg}/{car.highway_mpg}
          </span>
          <span className='text-[10px] leading-tight'>City/High MPG</span>
        </div>
      </div>
    </li>
  );
}
