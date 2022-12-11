import { type NextApiRequest, type NextApiResponse } from "next";

import { prisma } from "../../../server/db/client";

import * as Ably from 'ably';

import axios from 'axios';

const ABLY_KEY = process.env.ABLY_KEY;

const options: Ably.Types.ClientOptions = { key: ABLY_KEY };
const client = new Ably.Realtime(options); /* inferred type Ably.Realtime */
const channel = client.channels.get('ai_images'); /* inferred type Ably.Types.RealtimeChannel */


const DEFAULT_NEGATIVE_PROMPT = "multiple, text";

const PROMPT_GENERATOR_URL = 'https://chat-gpt-api-ruby.vercel.app/api/chatgpt/input'

const PROMPT_PREFIX = 'cpc_mrbeast style, '

const PROMPT_SUFFIX = '(((smiling face, happy face, face)))'


const createJob = async (req: NextApiRequest, res: NextApiResponse) => {
  const jobDetails = req.body;
  const { title, description, id, totalGenerations } = jobDetails;

  if (!title || !description || !id || !totalGenerations) {
    return res.status(400).json({ error: "Missing title, description, totalGenerations, or id" });
  }


  const getPrompt = async () => {
    const res = await axios.post(PROMPT_GENERATOR_URL, {
      title,
      description,
    }, {
      headers: {
        'Content-Type': 'application/json',
        "Accept-Encoding": "gzip,deflate,compress"
      }
    });

    return res.data;
  }

  const newJob = await prisma.job.create({
    data: {
      prompts: [],
      id,
      generationIds: []
    },
  });

  res.status(200).json({
    id,
    status: 'processing',
    note: 'please hit /api/jobs/:id to check on the status of your job'
  });

  //generate 3 prompts
  const prompts: string[] = [];

  while (prompts.length < 3) {
    try {
      console.log('getting prompt # ' + prompts.length)
      const prompt = await getPrompt();
      prompts.push(`${PROMPT_PREFIX}${prompt}${PROMPT_SUFFIX}`);
      console.log('saved prompt')
    }
    catch (e: any) {
      console.log(e);
      console.log('tryin again');
    }
  }

  //generate a generationId for each prompt
  const generationIds = prompts.map((prompt: string, index: number) => {
    return `${id}-${index}`;
  });

  const updatedJob = await prisma.job.update({
    where: {
      id,
    },
    data: {
      prompts,
      generationIds,
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
      count: totalGenerations,
    };
  });

  for (let i = 0; i < bodies.length; i++) {
    console.log(bodies[i]);
    channel.publish('generate', bodies[i]);
  }


};

export default createJob;
