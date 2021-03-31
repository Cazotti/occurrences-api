import { EmptyResultError, Sequelize } from 'sequelize';

import { Occurrence as OccurrenceDbModel } from '../database/models/occurrence';
import Occurrence, { OccurrenceAttributes } from '../models/occurrence.model';
import { OccurrenceRepositoryCreationError, OccurrenceRepositoryNotFoundError } from "../errors/repositories/occurrence.repository"
import OccurrenceParser from '../database/parsers/occurrence.parser';

interface OccurrenceRepositoryDependencies {
  driver: Sequelize;
  occurrenceParser: OccurrenceParser;
}

class OccurrenceRepository {
  private driver: Sequelize;
  private occurrenceParser: OccurrenceParser;

  constructor({
    driver,
    occurrenceParser
  }: OccurrenceRepositoryDependencies) {
    this.driver = driver;
    this.occurrenceParser = occurrenceParser;
  }

  async create(occurrence: Omit<OccurrenceAttributes, 'id'>): Promise<Occurrence> {
    const { description, code, registerAt } = occurrence;
    try {
      const createdOccurrence = await OccurrenceDbModel.create({
        description,
        code,
        registerAt
      });
      return this.parse(createdOccurrence);
    } catch (error) {
      if (error instanceof OccurrenceRepositoryCreationError) {
        throw new OccurrenceRepositoryCreationError(occurrence);
      }
      throw error;
    }
  }

  async list(): Promise<Occurrence[]> {
    const occurrences = await OccurrenceDbModel.findAll();
    return occurrences.map(dbModels => this.occurrenceParser.parse(dbModels));
  }

  async findById(id: number): Promise<Occurrence> {
    try {
      const occurrence = await OccurrenceDbModel.findOne({ rejectOnEmpty: true, where: { id } });

      return this.occurrenceParser.parse(occurrence);
    } catch (error) {
      if (error instanceof EmptyResultError) {
        throw new OccurrenceRepositoryNotFoundError('id', id.toString());
      }

      throw error;
    }
  }

  private parse(dbModel: OccurrenceDbModel): Occurrence {
    return this.occurrenceParser.parse(dbModel);
  }
}

export default OccurrenceRepository;
