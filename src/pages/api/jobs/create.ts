import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "../../../server/db/client";

import * as Ably from 'ably';

const ABLY_KEY = process.env.ABLY_KEY;

const options: Ably.Types.ClientOptions = { key: ABLY_KEY };
const client = new Ably.Realtime(options); /* inferred type Ably.Realtime */
const channel = client.channels.get('feed'); /* inferred type Ably.Types.RealtimeChannel */


const DEFAULT_NEGATIVE_PROMPT = "multiple, text";

const createJob = async (req: NextApiRequest, res: NextApiResponse) => {
  const jobDetails = req.body;
  const { prompts, id, totalGenerations } = jobDetails;
  if (!prompts || !id || !totalGenerations) {
    return res.status(400).json({ error: "Missing prompt or id" });
  }

  //generate a generationId for each prompt
  const generationIds = prompts.map((prompt: string, index: number) => {
    return `${id}-${index}`;
  });

  const newJob = await prisma.job.create({
    data: {
      prompts,
      id,
      generationIds
    },
  });

  // im gettin a bunch of prompts
  // I need to give each prompt a generationId
  // then hit ably with each generationId/prompt/count combo
  // then return the job id

  const bodies = prompts.map((prompt: string, index: number) => {
    return {
      prompt,
      negative_prompt: DEFAULT_NEGATIVE_PROMPT,
      baseId: id,
      generationId: generationIds[index],
      count: totalGenerations / prompts.length,
    };
  });

  for (let i = 0; i < bodies.length; i++) {
    console.log(bodies[i]);
    channel.publish('generate', bodies);
  }

  res.status(200).json({
    id,
    status: 'processing',
    note: 'please hit /api/jobs/:id to check on the status of your job'
  });
};

export default createJob;
