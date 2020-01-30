import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';

import { DeleteResult, Repository, UpdateResult, In } from 'typeorm';

import { HomeStay } from '../model/homestay';
import { FreeService } from '../model/homestay_freeservices';
import { async } from 'rxjs/internal/scheduler/async';
import { Season } from '../model/season';
import { HomeStayPrice } from '../model/homestay_price';
import { HomeStayChain } from '../model/homestay_chain';

/**
 * House handling service
 */
@Injectable()
export class HouseService {

  /**
   * Service constructor
   * @param houseRepository Instance of TypeORM's repository service for HomeStay
   * @param freeServiceRepository Instance of TypeORM's repository service for FreeService
   * @param seasonRepository
   * @param homeStayChainRepository
   */
  constructor(
    @InjectRepository(HomeStay)
    private readonly houseRepository: Repository<HomeStay>,
    @InjectRepository(FreeService)
    private readonly freeServiceRepository: Repository<FreeService>,
    @InjectRepository(Season)
    private readonly seasonRepository: Repository<Season>,
    @InjectRepository(HomeStayChain)
    private readonly homeStayChainRepository: Repository<HomeStayChain>,
    ) {
  }

  /**
   * Find all houses
   */
  async findAll(take, skip): Promise<HomeStay[]> {

    /* return all houses, including their relationship with Manager */
    if (take === undefined && skip === undefined) {
      return await this.houseRepository.find();
    } else if (take === undefined && skip !== undefined) {
      return await this.houseRepository.find({skip});
    } else if (take !== undefined && skip === undefined) {
      return await this.houseRepository.find({take});
    } else {
      return await this.houseRepository.find({take, skip});
    }

  }

  /**
   * Find houses by their owner
   * @param ownerId Id of the owner
   */
  async findByOwner(ownerId): Promise<HomeStay[]> {
    return await this.houseRepository.find({
      order: { name: 'ASC' },
      where: { ownerId },
    });
  }

  /**
   * Create a house
   * @param house New house data
   */
  async create(house: HomeStay): Promise<HomeStay> {
    this.setHouseDefaults(house);
    return await this.houseRepository.save(house);
  }

  /**
   * Update a house
   * @param house Modified house data
   */
  async update(house: HomeStay): Promise<HomeStay[]> {
    const houseToUpdate = await this.houseRepository.manager.findOne(HomeStay, house.id);
    for (const property in house) {
      if (house.hasOwnProperty(property)) {
        houseToUpdate[property] = house[property];
      }
    }
    return await this.houseRepository.manager.save<HomeStay>([houseToUpdate]);
  }

  /**
   * Delete a house by its id
   * @param id House Id
   */
  async delete(id): Promise<DeleteResult> {
    return await this.houseRepository.delete(id);
  }

  /**
   * Find a house by its id
   * @param id House's id
   */
  async findById(id: any): Promise<any> {

    // it's necessary to use the query builder to retrieve the second level relationship of province
    // homestay -> municipality -> province
    const homestay = await this.houseRepository.createQueryBuilder('homestay')
      .leftJoinAndSelect('homestay.municipality', 'municipality')
      .leftJoinAndSelect('homestay.accommodation', 'accommodation')
      .leftJoinAndSelect('homestay.homestayFreeservices', 'homestayFreeservices')
      .leftJoinAndSelect('homestay.homestayNotOffered', 'homestayNotOffered')
      .leftJoinAndSelect('homestay.homestayExtracosts', 'homestayExtracosts')
      .leftJoinAndSelect('homestay.places', 'places')
      .leftJoinAndSelect('municipality.province', 'province')
      // season and prices
      .leftJoinAndSelect('homestay.homestayPrices', 'homestayPrices')
      .innerJoinAndSelect('homestayPrices.season', 'season')
      .innerJoinAndSelect('season.seasonRanges', 'seasonRanges')
      .leftJoinAndSelect('homestay.chain', 'chain')
      .leftJoinAndSelect('chain.seasons', 'default_seasons')
      .where('homestay.id = :homestayId')
      .setParameter('homestayId', id)
      .getOne();
    return homestay;
  }

  /**
   * Set default values for house properties
   * @param house House to modify
   */
  private setHouseDefaults(house: HomeStay) {
    house.slug = house.name.replace(/\s/g, '-').toLowerCase();
    house.promo = false;
    house.enabled = false;
    house.comision = 5;
    house.showcontact = false;
    house.rank = 0;
    house.showHome = false;
    house.note = '';
  }
}
